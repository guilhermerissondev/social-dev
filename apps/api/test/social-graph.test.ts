import { schema } from '@social-dev/db';
import { eq } from '@social-dev/db/orm';
import { afterAll, describe, expect, inject, it } from 'vitest';

import { FOLLOW_PAGE_SIZE } from '../src/modules/social-graph/service.ts';
import { buildTestApp, createSignedInUser, sendJson, uniqueSuffix } from './helpers.ts';

const context = buildTestApp(inject('databaseUrl'));
const { app } = context;

afterAll(context.close);

interface ProfilePage {
  items: { username: string }[];
  nextCursor: string | null;
}

const follow = (cookie: string, username: string) =>
  sendJson(app, 'POST', `/api/profiles/${username}/follow`, undefined, cookie);
const unfollow = (cookie: string, username: string) =>
  sendJson(app, 'DELETE', `/api/profiles/${username}/follow`, undefined, cookie);

async function profile(username: string, cookie?: string) {
  const res = await sendJson(app, 'GET', `/api/profiles/${username}`, undefined, cookie);
  return (await res.json()) as Record<string, unknown>;
}

describe('following people', () => {
  it('follows and unfollows, updating counts and the viewer flag', async () => {
    const ada = await createSignedInUser(context);
    const grace = await createSignedInUser(context);

    expect((await follow(ada.cookie, grace.username.toUpperCase())).status).toBe(204);
    // Following twice is fine.
    expect((await follow(ada.cookie, grace.username)).status).toBe(204);

    expect(await profile(grace.username, ada.cookie)).toMatchObject({
      followersCount: 1,
      followingCount: 0,
      followedByViewer: true,
    });
    expect(await profile(ada.username)).toMatchObject({
      followersCount: 0,
      followingCount: 1,
      followedByViewer: false,
    });

    expect((await unfollow(ada.cookie, grace.username)).status).toBe(204);
    expect(await profile(grace.username, ada.cookie)).toMatchObject({
      followersCount: 0,
      followedByViewer: false,
    });
  });

  it('rejects following yourself, unknown accounts and anonymous requests', async () => {
    const ada = await createSignedInUser(context);

    expect((await follow(ada.cookie, ada.username)).status).toBe(400);
    expect((await follow(ada.cookie, 'nobody_here')).status).toBe(404);
    expect((await sendJson(app, 'POST', `/api/profiles/${ada.username}/follow`)).status).toBe(401);
  });

  it('lists followers and following, most recent first, across pages', async () => {
    const star = await createSignedInUser(context);
    const [starActor] = await context.db
      .select({ id: schema.actors.id })
      .from(schema.actors)
      .where(eq(schema.actors.username, star.username));
    if (!starActor) throw new Error('missing actor');

    // Creating accounts through the API hashes a password each time, which is slow, so the
    // followers are written directly. All follows share one timestamp to exercise the cursor's tiebreak.
    const followedAt = new Date();
    const fans = Array.from({ length: FOLLOW_PAGE_SIZE + 1 }, () => `fan_${uniqueSuffix()}`);
    const fanUsers = await context.db
      .insert(schema.users)
      .values(
        fans.map((username) => ({ name: username, email: `${username}@example.com`, username })),
      )
      .returning({ id: schema.users.id, username: schema.users.username });
    const fanActors = await context.db
      .insert(schema.actors)
      .values(
        fanUsers.map((user) => ({
          userId: user.id,
          username: user.username ?? '',
          displayName: 'Fan',
        })),
      )
      .returning({ id: schema.actors.id, username: schema.actors.username });
    await context.db.insert(schema.follows).values(
      fanActors.map((fan) => ({
        followerId: fan.id,
        followeeId: starActor.id,
        createdAt: followedAt,
      })),
    );

    const list = async (query = '') =>
      (await (
        await app.request(`/api/profiles/${star.username}/followers${query}`)
      ).json()) as ProfilePage;

    const first = await list();
    expect(first.items).toHaveLength(FOLLOW_PAGE_SIZE);
    const second = await list(`?cursor=${first.nextCursor ?? ''}`);
    expect(second.items).toHaveLength(1);
    expect(second.nextCursor).toBeNull();

    // Every follower shows up exactly once across the pages.
    const seen = [...first.items, ...second.items].map((item) => item.username).sort();
    expect(seen).toEqual([...fans].sort());

    const following = (await (
      await app.request(`/api/profiles/${fans[0] ?? ''}/following`)
    ).json()) as ProfilePage;
    expect(following.items.map((item) => item.username)).toEqual([star.username]);
  });

  it('lists the most recent follow first', async () => {
    const star = await createSignedInUser(context);
    const early = await createSignedInUser(context);
    const late = await createSignedInUser(context);
    await follow(early.cookie, star.username);
    await follow(late.cookie, star.username);

    const page = (await (
      await app.request(`/api/profiles/${star.username}/followers`)
    ).json()) as ProfilePage;
    expect(page.items.map((item) => item.username)).toEqual([late.username, early.username]);
  });

  it('ignores cursors it did not produce', async () => {
    const ada = await createSignedInUser(context);
    const res = await app.request(`/api/profiles/${ada.username}/followers?cursor=garbage`);
    expect(await res.json()).toEqual({ items: [], nextCursor: null });
  });
});

describe('following tags', () => {
  it('follows tags nobody has used yet and counts followers', async () => {
    const ada = await createSignedInUser(context);
    const grace = await createSignedInUser(context);
    const tag = `Zig_${uniqueSuffix()}`;

    expect(
      (await sendJson(app, 'POST', `/api/tags/${tag}/follow`, undefined, ada.cookie)).status,
    ).toBe(204);
    await sendJson(app, 'POST', `/api/tags/%23${tag}/follow`, undefined, grace.cookie);

    const info = await sendJson(app, 'GET', `/api/tags/${tag}`, undefined, ada.cookie);
    expect(await info.json()).toEqual({
      name: tag.toLowerCase(),
      followersCount: 2,
      followedByViewer: true,
    });

    await sendJson(app, 'DELETE', `/api/tags/${tag}/follow`, undefined, ada.cookie);
    const after = await sendJson(app, 'GET', `/api/tags/${tag}`, undefined, ada.cookie);
    expect(await after.json()).toMatchObject({ followersCount: 1, followedByViewer: false });
  });

  it('describes unused tags and rejects invalid names', async () => {
    expect(await (await app.request('/api/tags/never_used_tag')).json()).toEqual({
      name: 'never_used_tag',
      followersCount: 0,
      followedByViewer: false,
    });
    expect((await app.request('/api/tags/c++')).status).toBe(404);

    const ada = await createSignedInUser(context);
    const res = await sendJson(app, 'POST', '/api/tags/c++/follow', undefined, ada.cookie);
    expect(res.status).toBe(400);
  });
});
