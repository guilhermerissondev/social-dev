import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema/index.ts';

export interface DatabaseOptions {
  /** Maximum number of connections in the pool. */
  maxConnections?: number;
}

export function createDatabase(url: string, options: DatabaseOptions = {}) {
  const client = postgres(url, { max: options.maxConnections ?? 10 });
  const db = drizzle({ client, schema, casing: 'snake_case' });

  return {
    db,
    close: () => client.end(),
  };
}

export type Database = ReturnType<typeof createDatabase>['db'];

export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

/** Either the database or an open transaction, for functions that work inside both. */
export type Executor = Database | Transaction;
