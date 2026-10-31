import { serve } from '@hono/node-server';
import { createDatabase } from '@social-dev/db';

import { createApp } from './app.ts';
import { createAuth } from './auth/auth.ts';
import { createGitHubClient } from './github/client.ts';
import { loadEnv } from './env.ts';
import { createLogger } from './logger.ts';
import { createSmtpMailer } from './mail/mailer.ts';

const env = loadEnv();
const logger = createLogger(env);
const database = createDatabase(env.DATABASE_URL);
const mailer = createSmtpMailer(env.SMTP_URL, env.MAIL_FROM);
const auth = createAuth({
  db: database.db,
  env,
  mailer,
  logger,
  rateLimit: env.AUTH_RATE_LIMIT,
});
const app = createApp({
  db: database.db,
  logger,
  auth,
  github: createGitHubClient(),
  webUrl: env.WEB_URL,
});

const server = serve({ fetch: app.fetch, port: env.API_PORT }, (info) => {
  logger.info(`API listening on http://localhost:${info.port}`);
});

function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down');
  server.close(() => {
    void database.close().then(() => process.exit(0));
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
