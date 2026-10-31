import { serve } from '@hono/node-server';
import { createDatabase } from '@social-dev/db';

import { createApp } from './app.ts';
import { loadEnv } from './env.ts';
import { createLogger } from './logger.ts';

const env = loadEnv();
const logger = createLogger(env);
const database = createDatabase(env.DATABASE_URL);
const app = createApp({ db: database.db, logger });

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
