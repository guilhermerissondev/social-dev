// Brings in the typing for `inject('databaseUrl')`.
import type {} from '@social-dev/db/testing/global-setup';
import { createDatabase } from '@social-dev/db';
import { pino } from 'pino';

import { createApp } from '../src/app.ts';

/** Builds the app against the given database with a silent logger. */
export function buildTestApp(databaseUrl: string) {
  const database = createDatabase(databaseUrl, { maxConnections: 2 });
  const app = createApp({ db: database.db, logger: pino({ level: 'silent' }) });
  return { app, close: database.close };
}
