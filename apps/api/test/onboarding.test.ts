import { afterAll, describe, expect, inject, it } from 'vitest';

import { buildTestApp, createSignedInUser, sendJson, uniqueSuffix } from './helpers.ts';

const context = buildTestApp(inject('databaseUrl'));
const { app } = context;

afterAll(context.close);

const baseProfile = { displayName: 'Dev', bio: '', location: '', links: [] };

async function setStack(cookie: string, technologies: string[]) {
  const res = await sendJson(
    app,
    'PUT',
    '/api/me/profile',
    { ...baseProfile, technologies },
    cookie,
  );
  expect(res.status).toBe(200);
}

const follow = (cookie: string, username: string) =>
  sendJson(app, 'POST', `/api/profiles/${username}/follow`, undefined, cookie);

interface Suggestion {
  username: string;
  sharedTechnologies: string[];
  followedByFollowing: number;
}

async function suggestedPeople(cookie: string) {
  const res = await sendJson(app, 'GET', '/api/me/suggestions/people?limit=30', undefined, cookie);
  expect(res.status).toBe(200);
  return ((await res.json()) as { items: Suggestion[] }).items;
}

describe('onboarding', () => {
  it('starts unfinished for new accounts and can be completed', async () => {
    const user = await createSignedInUser(context);
    const me = async () =>
      (await (await sendJson(app, 'GET', '/api/me', undefined, user.cookie)).json()) as {
        onboardingCompletedAt: string | null;
      };
    expect((await me()).onboardingCompletedAt).toBeNull();

    const res = await sendJson(app, 'POST', '/api/me/onboarding/complete', undefined, user.cookie);
    expect(res.status).toBe(204);
    expect((await me()).onboardingCompletedAt).toEqual(expect.any(String));

    // The session carries it too, which is what the web app reads.
    const session = await sendJson(app, 'GET', '/api/auth/get-session', undefined, user.cookie);
    expect(await session.json()).toMatchObject({
      user: { onboardingCompletedAt: expect.any(String) as unknown },
    });
  });

  it('cannot be set through Better Auth', async () => {
    const user = await createSignedInUser(context);
    await sendJson(
      app,
      'POST',
      '/api/auth/update-user',
      { onboardingCompletedAt: new Date().toISOString() },
      user.cookie,
    );
    const res = await sendJson(app, 'GET', '/api/me', undefined, user.cookie);
    expect(await res.json()).toMatchObject({ onboardingCompletedAt: null });
  });
});

describe('people suggestions', () => {
  it('ranks shared stack, then people followed by those you follow, and skips who you follow', async () => {
    const [techA, techB] = [`lang_${uniqueSuffix()}`, `lang_${uniqueSuffix()}`];
    const me = await createSignedInUser(context);
    await setStack(me.cookie, [techA, techB]);

    const sameStack = await createSignedInUser(context);
    await setStack(sameStack.cookie, [techB, techA]);

    // Two people I follow both follow "friendOfFriends".
    const friendOfFriends = await createSignedInUser(context);
    for (let index = 0; index < 2; index += 1) {
      const friend = await createSignedInUser(context);
      await follow(me.cookie, friend.username);
      await follow(friend.cookie, friendOfFriends.username);
    }

    const suggestions = await suggestedPeople(me.cookie);
    expect(suggestions[0]).toMatchObject({
      username: sameStack.username,
      sharedTechnologies: [techB, techA],
    });
    expect(suggestions[1]).toMatchObject({
      username: friendOfFriends.username,
      followedByFollowing: 2,
    });

    const usernames = suggestions.map((suggestion) => suggestion.username);
    expect(usernames).not.toContain(me.username);
    await follow(me.cookie, sameStack.username);
    expect((await suggestedPeople(me.cookie)).map((s) => s.username)).not.toContain(
      sameStack.username,
    );
  });
});

describe('tag suggestions', () => {
  it('suggests your stack first and leaves out tags you follow', async () => {
    const [techA, techB] = [`lang_${uniqueSuffix()}`, `lang_${uniqueSuffix()}`];
    const me = await createSignedInUser(context);
    await setStack(me.cookie, [techA, techB]);
    await sendJson(app, 'POST', `/api/tags/${techA}/follow`, undefined, me.cookie);

    const res = await sendJson(app, 'GET', '/api/me/suggestions/tags', undefined, me.cookie);
    const { items } = (await res.json()) as { items: string[] };
    expect(items[0]).toBe(techB);
    expect(items).not.toContain(techA);
  });
});
