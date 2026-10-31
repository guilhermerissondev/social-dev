import { sql } from 'drizzle-orm';

import type { Database } from './client.ts';

/** Runs a trivial query to confirm the database is reachable. Throws if it is not. */
export async function pingDatabase(db: Database): Promise<void> {
  await db.execute(sql`select 1`);
}
