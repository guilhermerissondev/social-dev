import { afterAll, describe, expect, inject, it } from 'vitest';

import { buildTestApp, createSignedInUser, sendJson } from './helpers.ts';

const context = buildTestApp(inject('databaseUrl'));
const { app } = context;

afterAll(context.close);

interface Entry {
  id: string;
  entryId: string;
  content: string;
  repostsCount: number;
  repostedByViewer: boolean;
  repostedBy: { username: string } | null;
}

async function publish(cookie: string, content: string) {
  const res = await sendJson(app, 'POST', '/api/posts', { content }, cookie);
  return ((await res.json()) as { id: string }).id;
}

const repost = (method: 'POST' | 'DELETE', id: string, cookie: string) =>
  sendJson(app, method, `/api/posts/${id}/repost`, undefined, cookie);

async function list(path: string, cookie?: string) {
  const res = await sendJson(app, 'GET', path, undefined, cookie);
  return (await res.json()) as { items: Entry[]; nextCursor: string | null };
}

describe('reposts', () => {
  it('shows reposts in the feed of followers, at the time of the repost', async () => {
    const reader = await createSignedInUser(context);
    const booster = await createSignedInUser(context);
    const author = await createSignedInUser(context);
    await sendJson(
      app,
      'POST',
      `/api/profiles/${booster.username}/follow`,
      undefined,
      reader.cookie,
    );

    const old = await publish(author.cookie, 'an older post');
    await publish(booster.cookie, 'booster says hi');
    expect((await repost('POST', old, booster.cookie)).status).toBe(204);

    const feed = await list('/api/feed', reader.cookie);
    expect(feed.items.map((entry) => [entry.content, entry.repostedBy?.username ?? null])).toEqual([
      ['an older post', booster.username],
      ['booster says hi', null],
    ]);
    expect(feed.items[0]).toMatchObject({ id: old, repostsCount: 1, repostedByViewer: false });
    expect(feed.items[0]?.entryId).not.toBe(old);
  });

  it('lists reposts on the profile of the person who reposted', async () => {
    const booster = await createSignedInUser(context);
    const author = await createSignedInUser(context);
    const post = await publish(author.cookie, 'worth sharing');
    await repost('POST', post, booster.cookie);

    const profile = await list(`/api/profiles/${booster.username}/posts`, booster.cookie);
    expect(profile.items).toMatchObject([
      { id: post, repostedBy: { username: booster.username }, repostedByViewer: true },
    ]);
  });

  it('counts each person once, notifies the author and undoes cleanly', async () => {
    const booster = await createSignedInUser(context);
    const author = await createSignedInUser(context);
    const post = await publish(author.cookie, 'hello');

    await repost('POST', post, booster.cookie);
    await repost('POST', post, booster.cookie);
    const res = await sendJson(app, 'GET', `/api/posts/${post}`, undefined, booster.cookie);
    expect(await res.json()).toMatchObject({ repostsCount: 1, repostedByViewer: true });

    const notifications = await sendJson(
      app,
      'GET',
      '/api/notifications',
      undefined,
      author.cookie,
    );
    expect(await notifications.json()).toMatchObject({ items: [{ type: 'repost' }] });

    await repost('DELETE', post, booster.cookie);
    expect((await list(`/api/profiles/${booster.username}/posts`)).items).toEqual([]);
    const after = await sendJson(app, 'GET', '/api/notifications', undefined, author.cookie);
    expect(await after.json()).toMatchObject({ items: [] });
  });

  it('pages through posts and reposts together', async () => {
    const user = await createSignedInUser(context);
    const other = await createSignedInUser(context);
    const posts = [];
    for (let index = 0; index < 12; index += 1)
      posts.push(await publish(other.cookie, `p${index}`));
    for (const post of posts) await repost('POST', post, user.cookie);
    for (let index = 0; index < 12; index += 1) await publish(user.cookie, `own${index}`);

    const first = await list(`/api/profiles/${user.username}/posts`);
    const second = await list(
      `/api/profiles/${user.username}/posts?before=${first.nextCursor ?? ''}`,
    );
    expect(first.items).toHaveLength(20);
    expect(second.items).toHaveLength(4);
    expect(second.nextCursor).toBeNull();
    const all = [...first.items, ...second.items].map((entry) => entry.entryId);
    expect(new Set(all).size).toBe(24);
  });

  it('removes reposts when the post is deleted', async () => {
    const booster = await createSignedInUser(context);
    const author = await createSignedInUser(context);
    const post = await publish(author.cookie, 'gone soon');
    await repost('POST', post, booster.cookie);

    await sendJson(app, 'DELETE', `/api/posts/${post}`, undefined, author.cookie);
    expect((await list(`/api/profiles/${booster.username}/posts`)).items).toEqual([]);
  });
});
