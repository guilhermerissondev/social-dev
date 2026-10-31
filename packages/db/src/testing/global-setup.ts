import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

/**
 * Vitest global setup that starts a throwaway PostgreSQL container and exposes its
 * connection string to tests through `inject('databaseUrl')`.
 */
export default async function setup(project: TestProject) {
  const container = await new PostgreSqlContainer('postgres:18-alpine').start();
  project.provide('databaseUrl', container.getConnectionUri());

  return async () => {
    await container.stop();
  };
}
