// Brings in the typing for `inject('databaseUrl')`.
import type {} from '@social-dev/db/testing/global-setup';

import { createDatabase, schema } from '@social-dev/db';
import { eq } from '@social-dev/db/orm';
import { pino } from 'pino';

import { createApp } from '../src/app.ts';
import { createAuth } from '../src/auth/auth.ts';
import type { Mailer, MailMessage } from '../src/mail/mailer.ts';

export const WEB_URL = 'http://localhost:3000';

/** Mailer that keeps messages in memory so tests can read them. */
export function createMemoryMailer() {
  const messages: MailMessage[] = [];
  const mailer: Mailer = {
    send(message) {
      messages.push(message);
      return Promise.resolve();
    },
  };
  return { mailer, messages };
}

/** Builds the app against the given database with a silent logger and an in-memory mailer. */
export function buildTestApp(databaseUrl: string) {
  const database = createDatabase(databaseUrl, { maxConnections: 2 });
  const logger = pino({ level: 'silent' });
  const { mailer, messages } = createMemoryMailer();
  const auth = createAuth({
    db: database.db,
    env: { WEB_URL, BETTER_AUTH_SECRET: 'test-secret-that-is-at-least-32-chars-long' },
    mailer,
    logger,
    rateLimit: false,
  });
  const app = createApp({ db: database.db, logger, auth, webUrl: WEB_URL });
  return { app, db: database.db, emails: messages, close: database.close };
}

export type TestApp = ReturnType<typeof buildTestApp>;

/** Sends a JSON request from the web app's origin, optionally with a session cookie. */
export function sendJson(
  app: TestApp['app'],
  method: string,
  path: string,
  body?: unknown,
  cookie?: string,
) {
  return app.request(path, {
    method,
    headers: {
      'content-type': 'application/json',
      origin: WEB_URL,
      ...(cookie && { cookie }),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
}

/** Turns Set-Cookie headers into a Cookie header for the next request. */
export function cookiesFrom(res: Response): string {
  return res.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ');
}

/** Unique suffix so test files sharing the database never collide. */
export function uniqueSuffix(): string {
  return crypto.randomUUID().replaceAll('-', '').slice(0, 10);
}

interface SignedInUser<Username> {
  name: string;
  email: string;
  password: string;
  username: Username;
  cookie: string;
}

/**
 * Creates an account with a verified email and signs it in, skipping the email round trip.
 * Pass `username: null` to get an account like the ones GitHub and GitLab create.
 */
export async function createSignedInUser(
  context: Pick<TestApp, 'app' | 'db'>,
  options?: { username?: string },
): Promise<SignedInUser<string>>;
export async function createSignedInUser(
  context: Pick<TestApp, 'app' | 'db'>,
  options: { username: null },
): Promise<SignedInUser<null>>;
export async function createSignedInUser(
  { app, db }: Pick<TestApp, 'app' | 'db'>,
  options: { username?: string | null } = {},
): Promise<SignedInUser<string | null>> {
  const suffix = uniqueSuffix();
  const username = options.username === undefined ? `grace_${suffix}` : options.username;
  const user = {
    name: `Grace ${suffix}`,
    email: `grace_${suffix}@example.com`,
    password: 'correct horse battery staple',
  };

  const signUp = await sendJson(app, 'POST', '/api/auth/sign-up/email', {
    ...user,
    ...(username !== null && { username }),
  });
  if (signUp.status !== 200) throw new Error(`sign up failed: ${await signUp.text()}`);
  await db
    .update(schema.users)
    .set({ emailVerified: true })
    .where(eq(schema.users.email, user.email));

  const signIn = await sendJson(app, 'POST', '/api/auth/sign-in/email', {
    email: user.email,
    password: user.password,
  });
  if (signIn.status !== 200) throw new Error(`sign in failed: ${await signIn.text()}`);

  return { ...user, username, cookie: cookiesFrom(signIn) };
}
