import { describe, expect, it } from 'vitest';

import { loadEnv } from '../src/env.ts';

describe('loadEnv', () => {
  it('applies defaults', () => {
    const env = loadEnv({ DATABASE_URL: 'postgres://u:p@localhost:5432/db' });
    expect(env).toMatchObject({ NODE_ENV: 'development', API_PORT: 4000, LOG_LEVEL: 'info' });
  });

  it('rejects a missing or invalid database URL', () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
    expect(() => loadEnv({ DATABASE_URL: 'mysql://localhost/db' })).toThrow(/DATABASE_URL/);
  });
});
