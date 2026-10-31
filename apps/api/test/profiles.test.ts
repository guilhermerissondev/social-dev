import { afterAll, describe, expect, inject, it } from 'vitest';

import { buildTestApp, createSignedInUser, sendJson, uniqueSuffix, WEB_URL } from './helpers.ts';

const context = buildTestApp(inject('databaseUrl'));
const { app } = context;

afterAll(context.close);

const profileInput = {
  displayName: 'Grace Hopper',
  bio: 'Compilers and COBOL.',
  location: 'Arlington',
  links: [{ label: 'Site', url: 'https://grace.dev' }],
  technologies: ['COBOL', '#Fortran', 'cobol'],
};

describe('GET /api/profiles/{username}', () => {
  it('creates the profile at sign-up and finds it ignoring case', async () => {
    const user = await createSignedInUser(context, { username: `Grace_${uniqueSuffix()}` });

    const res = await app.request(`/api/profiles/${user.username.toUpperCase()}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      username: user.username,
      displayName: user.name,
      bio: '',
      links: [],
      technologies: [],
    });
  });

  it('returns 404 for an unknown username', async () => {
    const res = await app.request('/api/profiles/nobody_here');
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/me/profile', () => {
  it('updates the profile and keeps technologies unique and in order', async () => {
    const user = await createSignedInUser(context);

    const res = await sendJson(app, 'PUT', '/api/me/profile', profileInput, user.cookie);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      displayName: 'Grace Hopper',
      bio: 'Compilers and COBOL.',
      location: 'Arlington',
      links: [{ label: 'Site', url: 'https://grace.dev' }],
      technologies: ['cobol', 'fortran'],
    });

    // Saving again replaces the list instead of appending to it.
    const again = await sendJson(
      app,
      'PUT',
      '/api/me/profile',
      { ...profileInput, technologies: ['fortran'] },
      user.cookie,
    );
    expect(await again.json()).toMatchObject({ technologies: ['fortran'] });

    const me = await sendJson(app, 'GET', '/api/me', undefined, user.cookie);
    expect(await me.json()).toMatchObject({ name: 'Grace Hopper' });
  });

  it('rejects invalid input', async () => {
    const user = await createSignedInUser(context);
    const links = [{ label: 'x', url: 'javascript:alert(1)' }];

    const res = await sendJson(
      app,
      'PUT',
      '/api/me/profile',
      { ...profileInput, links },
      user.cookie,
    );
    expect(res.status).toBe(400);
  });

  it('requires a session', async () => {
    const res = await sendJson(app, 'PUT', '/api/me/profile', profileInput);
    expect(res.status).toBe(401);
  });

  it('requires a username first', async () => {
    const user = await createSignedInUser(context, { username: null });

    const res = await sendJson(app, 'PUT', '/api/me/profile', profileInput, user.cookie);
    expect(res.status).toBe(409);
  });

  it('rejects form submissions from other sites', async () => {
    const user = await createSignedInUser(context, { username: null });

    const res = await app.request('/api/me/username', {
      method: 'POST',
      headers: {
        'content-type': 'text/plain',
        origin: 'https://evil.example',
        cookie: user.cookie,
      },
      body: JSON.stringify({ username: `evil_${uniqueSuffix()}` }),
    });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/me/username', () => {
  it('lets accounts created without a username choose one', async () => {
    const user = await createSignedInUser(context, { username: null });
    const username = `Linus_${uniqueSuffix()}`;

    const res = await sendJson(app, 'POST', '/api/me/username', { username }, user.cookie);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ username, displayName: user.name });

    const me = await sendJson(app, 'GET', '/api/me', undefined, user.cookie);
    expect(await me.json()).toMatchObject({ username: username.toLowerCase() });
  });

  it('rejects a username that is taken, ignoring case', async () => {
    const owner = await createSignedInUser(context);
    const user = await createSignedInUser(context, { username: null });

    const res = await sendJson(
      app,
      'POST',
      '/api/me/username',
      { username: owner.username.toUpperCase() },
      user.cookie,
    );
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: { code: 'username_taken' } });
  });

  it('does not let an account change its username', async () => {
    const user = await createSignedInUser(context);

    const claim = await sendJson(
      app,
      'POST',
      '/api/me/username',
      { username: `other_${uniqueSuffix()}` },
      user.cookie,
    );
    expect(claim.status).toBe(409);

    const update = await sendJson(
      app,
      'POST',
      '/api/auth/update-user',
      { username: `other_${uniqueSuffix()}` },
      user.cookie,
    );
    expect(update.status).toBe(400);

    const profile = await app.request(`/api/profiles/${user.username}`);
    expect(profile.status).toBe(200);
  });

  it('still lets the account update other fields through Better Auth', async () => {
    const user = await createSignedInUser(context);

    const res = await sendJson(app, 'POST', '/api/auth/update-user', { name: 'New' }, user.cookie);
    expect(res.status).toBe(200);
  });
});

it('documents the profile routes in OpenAPI', async () => {
  const res = await app.request('/openapi.json', { headers: { origin: WEB_URL } });
  const doc = (await res.json()) as { paths: Record<string, unknown> };
  expect(Object.keys(doc.paths)).toEqual(
    expect.arrayContaining(['/api/profiles/{username}', '/api/me/profile', '/api/me/username']),
  );
});
