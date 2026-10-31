import { schema } from '@social-dev/db';
import { eq } from '@social-dev/db/orm';
import { afterAll, describe, expect, inject, it } from 'vitest';

import { MANUAL_REFRESH_AFTER_MS } from '../src/modules/github/service.ts';
import {
  buildTestApp,
  connectGitHub,
  createSignedInUser,
  sendJson,
  uniqueSuffix,
} from './helpers.ts';

const context = buildTestApp(inject('databaseUrl'), { githubOAuth: true });
const { app, github } = context;

afterAll(context.close);

const repo = (name: string) => ({
  name,
  nameWithOwner: `grace/${name}`,
  description: `About ${name}`,
  url: `https://github.com/grace/${name}`,
  stars: 7,
  language: { name: 'TypeScript', color: '#3178c6' },
});

const newGitHubId = () => String(Math.floor(Math.random() * 1e9));

async function status(cookie: string, method: 'GET' | 'POST' = 'GET') {
  const path = method === 'GET' ? '/api/me/github' : '/api/me/github/refresh';
  const res = await sendJson(app, method, path, undefined, cookie);
  expect(res.status).toBe(200);
  return (await res.json()) as {
    connected: boolean;
    login: string | null;
    pinnedRepos: { name: string }[];
    showOnProfile: boolean;
  };
}

describe('GitHub connection', () => {
  it('reports accounts without GitHub as not connected', async () => {
    const user = await createSignedInUser(context);
    expect(await status(user.cookie)).toMatchObject({
      connected: false,
      login: null,
      pinnedRepos: [],
    });
  });

  it('reads the login and pinned repositories and shows them on the profile', async () => {
    const user = await createSignedInUser(context);
    const login = `grace${uniqueSuffix()}`;
    await connectGitHub(context, user.email, {
      githubId: newGitHubId(),
      login,
      pinnedRepos: [repo('compiler'), repo('cobol')],
    });

    expect(await status(user.cookie)).toMatchObject({
      connected: true,
      login,
      showOnProfile: true,
      pinnedRepos: [{ name: 'compiler' }, { name: 'cobol' }],
    });
    const profile = await app.request(`/api/profiles/${user.username}`);
    expect(await profile.json()).toMatchObject({
      github: { login, pinnedRepos: [{ name: 'compiler' }, { name: 'cobol' }] },
    });
  });

  it('hides GitHub from the profile when the owner says so', async () => {
    const user = await createSignedInUser(context);
    await connectGitHub(context, user.email, { githubId: newGitHubId(), login: 'hidden' });
    await status(user.cookie);

    const res = await sendJson(
      app,
      'PUT',
      '/api/me/github/settings',
      { showOnProfile: false },
      user.cookie,
    );
    expect(res.status).toBe(204);
    const profile = await app.request(`/api/profiles/${user.username}`);
    expect(await profile.json()).toMatchObject({ github: null });
  });

  it('does not call GitHub again while the data is fresh', async () => {
    const user = await createSignedInUser(context);
    await connectGitHub(context, user.email, { githubId: newGitHubId(), login: 'fresh' });

    await status(user.cookie);
    const calls = github.state.viewerCalls;
    await status(user.cookie);
    await status(user.cookie, 'POST');
    expect(github.state.viewerCalls).toBe(calls);
    expect(MANUAL_REFRESH_AFTER_MS).toBeGreaterThan(0);
  });

  it('keeps the stored data when GitHub is down', async () => {
    const user = await createSignedInUser(context);
    await connectGitHub(context, user.email, {
      githubId: newGitHubId(),
      login: 'steady',
      pinnedRepos: [repo('kept')],
    });
    await status(user.cookie);

    github.state.down = true;
    try {
      // The stored data is old enough for a manual refresh, which fails quietly.
      await context.db
        .update(schema.githubProfiles)
        .set({ fetchedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) })
        .where(eq(schema.githubProfiles.login, 'steady'));
      expect(await status(user.cookie, 'POST')).toMatchObject({
        connected: true,
        pinnedRepos: [{ name: 'kept' }],
      });
    } finally {
      github.state.down = false;
    }
  });
});

describe('GitHub follows', () => {
  it('finds people you follow on GitHub and follows them all at once', async () => {
    const [adaId, linusId, strangerId] = [newGitHubId(), newGitHubId(), newGitHubId()];
    const ada = await createSignedInUser(context);
    const linus = await createSignedInUser(context);
    const stranger = await createSignedInUser(context);
    await connectGitHub(context, ada.email, { githubId: adaId, login: 'ada' });
    await connectGitHub(context, linus.email, { githubId: linusId, login: 'linus' });
    await connectGitHub(context, stranger.email, { githubId: strangerId, login: 'stranger' });

    const me = await createSignedInUser(context);
    // I follow Ada and Linus on GitHub, plus someone who is not on Social Dev.
    await connectGitHub(context, me.email, {
      githubId: newGitHubId(),
      login: 'me',
      following: [adaId, linusId, newGitHubId()],
    });
    await sendJson(app, 'POST', `/api/profiles/${ada.username}/follow`, undefined, me.cookie);

    const res = await sendJson(app, 'GET', '/api/me/github/following', undefined, me.cookie);
    const { items } = (await res.json()) as {
      items: { username: string; followedByViewer: boolean }[];
    };
    expect(items.map((item) => [item.username, item.followedByViewer]).sort()).toEqual(
      [
        [ada.username, true],
        [linus.username, false],
      ].sort(),
    );

    const followAll = await sendJson(
      app,
      'POST',
      '/api/me/github/follow-all',
      undefined,
      me.cookie,
    );
    expect(await followAll.json()).toEqual({ followed: 1 });
    const profile = await sendJson(
      app,
      'GET',
      `/api/profiles/${linus.username}`,
      undefined,
      me.cookie,
    );
    expect(await profile.json()).toMatchObject({ followedByViewer: true });
  });

  it('answers 404 without GitHub and 502 when GitHub is down', async () => {
    const plain = await createSignedInUser(context);
    const notConnected = await sendJson(
      app,
      'GET',
      '/api/me/github/following',
      undefined,
      plain.cookie,
    );
    expect(notConnected.status).toBe(404);

    const user = await createSignedInUser(context);
    await connectGitHub(context, user.email, { githubId: newGitHubId(), login: 'down' });
    github.state.down = true;
    try {
      const res = await sendJson(app, 'GET', '/api/me/github/following', undefined, user.cookie);
      expect(res.status).toBe(502);
    } finally {
      github.state.down = false;
    }
  });
});
