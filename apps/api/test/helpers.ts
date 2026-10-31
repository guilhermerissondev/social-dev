// Brings in the typing for `inject('databaseUrl')`.
import type {} from '@social-dev/db/testing/global-setup';

import { createDatabase } from '@social-dev/db';
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
  const app = createApp({ db: database.db, logger, auth });
  return { app, emails: messages, close: database.close };
}
