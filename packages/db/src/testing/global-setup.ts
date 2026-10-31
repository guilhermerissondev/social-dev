import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';

import { createDatabase } from '../client.ts';
import { runMigrations } from '../migrate.ts';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

/**
 * Vitest global setup that starts a throwaway PostgreSQL container and exposes its
 * connection string to tests through `inject('databaseUrl')`. All migrations are applied.
 */
export default async function setup(project: TestProject) {
  const container = await new PostgreSqlContainer('postgres:18-alpine').start();
  const url = container.getConnectionUri();

  const database = createDatabase(url, { maxConnections: 1 });
  await runMigrations(database.db);
  await database.close();

  project.provide('databaseUrl', url);

  return async () => {
    await container.stop();
  };
}
