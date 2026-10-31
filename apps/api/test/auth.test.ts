import { afterAll, describe, expect, inject, it } from 'vitest';

import { buildTestApp, WEB_URL } from './helpers.ts';

const { app, emails, close } = buildTestApp(inject('databaseUrl'));

afterAll(close);

function post(path: string, body: unknown, cookie?: string) {
  return app.request(path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: WEB_URL,
      ...(cookie && { cookie }),
    },
    body: JSON.stringify(body),
  });
}

function cookiesFrom(res: Response): string {
  return res.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ');
}

/** Turns the absolute link from an email into a path the test app can request. */
function linkFrom(text: string): string {
  const match = /https?:\/\/\S+/.exec(text);
  if (!match) throw new Error('no link in email');
  const url = new URL(match[0]);
  return url.pathname + url.search;
}

let counter = 0;
function newUser() {
  counter += 1;
  return {
    name: `Ada ${counter}`,
    email: `ada${counter}@example.com`,
    username: `Ada_${counter}`,
    password: 'correct horse battery staple',
  };
}

describe('sign up with email and password', () => {
  it('creates the account, verifies the email and signs in', async () => {
    const user = newUser();

    const signUp = await post('/api/auth/sign-up/email', user);
    expect(signUp.status).toBe(200);

    // Unverified accounts cannot sign in yet.
    const early = await post('/api/auth/sign-in/email', {
      email: user.email,
      password: user.password,
    });
    expect(early.status).toBe(403);

    const email = emails.findLast((message) => message.to === user.email);
    expect(email?.subject).toMatch(/Confirme seu e-mail/);

    const verify = await app.request(linkFrom(email?.text ?? ''));
    expect(verify.status).toBe(302);

    const signIn = await post('/api/auth/sign-in/email', {
      email: user.email,
      password: user.password,
    });
    expect(signIn.status).toBe(200);

    const me = await app.request('/api/me', { headers: { cookie: cookiesFrom(signIn) } });
    expect(me.status).toBe(200);
    expect(await me.json()).toMatchObject({
      name: user.name,
      email: user.email,
      username: user.username.toLowerCase(),
      emailVerified: true,
    });
  });

  it('signs in with the username as well', async () => {
    const user = newUser();
    await post('/api/auth/sign-up/email', user);
    await app.request(linkFrom(emails.at(-1)?.text ?? ''));

    const res = await post('/api/auth/sign-in/username', {
      username: user.username,
      password: user.password,
    });
    expect(res.status).toBe(200);
  });

  it('rejects a username that is already taken, ignoring case', async () => {
    const first = newUser();
    await post('/api/auth/sign-up/email', first);

    const res = await post('/api/auth/sign-up/email', {
      ...newUser(),
      username: first.username.toUpperCase(),
    });
    expect(res.status).toBe(400);
  });

  it('rejects usernames with invalid characters', async () => {
    const res = await post('/api/auth/sign-up/email', { ...newUser(), username: 'not valid!' });
    expect(res.status).toBe(400);
  });

  it('rejects short passwords', async () => {
    const res = await post('/api/auth/sign-up/email', { ...newUser(), password: 'short' });
    expect(res.status).toBe(400);
  });

  it('does not reveal whether an email is registered when resetting the password', async () => {
    const user = newUser();
    await post('/api/auth/sign-up/email', user);

    const known = await post('/api/auth/request-password-reset', { email: user.email });
    const unknown = await post('/api/auth/request-password-reset', { email: 'nobody@example.com' });

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(await known.json()).toEqual(await unknown.json());
  });
});

describe('GET /api/me', () => {
  it('returns 401 without a session', async () => {
    const res = await app.request('/api/me');
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: 'unauthorized', message: 'You need to sign in' },
    });
  });
});

describe('GET /api/auth-providers', () => {
  it('lists no providers when none are configured', async () => {
    const res = await app.request('/api/auth-providers');
    expect(await res.json()).toEqual({ providers: [] });
  });
});
