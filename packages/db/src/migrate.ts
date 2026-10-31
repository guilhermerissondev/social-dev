import { migrate } from 'drizzle-orm/postgres-js/migrator';

import type { Database } from './client.ts';

const migrationsFolder = new URL('../drizzle', import.meta.url).pathname;

/** Applies all pending migrations from packages/db/drizzle. */
export async function runMigrations(db: Database): Promise<void> {
  await migrate(db, { migrationsFolder });
}
