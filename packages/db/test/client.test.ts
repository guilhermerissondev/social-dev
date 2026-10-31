import { sql } from 'drizzle-orm';
import { afterAll, describe, expect, inject, it } from 'vitest';

import { createDatabase } from '../src/index.ts';

describe('createDatabase', () => {
  const { db, close } = createDatabase(inject('databaseUrl'));

  afterAll(async () => {
    await close();
  });

  it('connects to PostgreSQL', async () => {
    const [row] = await db.execute<{ ok: number }>(sql`select 1 as ok`);
    expect(row?.ok).toBe(1);
  });

  it('generates time-ordered UUIDv7 identifiers natively (PostgreSQL 18+)', async () => {
    const [row] = await db.execute<{ first: string; second: string }>(
      sql`select uuidv7()::text as first, uuidv7()::text as second`,
    );
    expect(row?.first.charAt(14)).toBe('7');
    expect(row && row.first < row.second).toBe(true);
  });
});
