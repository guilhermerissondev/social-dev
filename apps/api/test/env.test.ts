import { describe, expect, it } from 'vitest';

import { loadEnv } from '../src/env.ts';

const required = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  WEB_URL: 'http://localhost:3000',
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  SMTP_URL: 'smtp://localhost:1025',
};

describe('loadEnv', () => {
  it('applies defaults', () => {
    expect(loadEnv(required)).toMatchObject({
      NODE_ENV: 'development',
      API_PORT: 4000,
      LOG_LEVEL: 'info',
    });
  });

  it('rejects a missing or invalid database URL', () => {
    expect(() => loadEnv({ ...required, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/);
    expect(() => loadEnv({ ...required, DATABASE_URL: 'mysql://localhost/db' })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('rejects a short auth secret', () => {
    expect(() => loadEnv({ ...required, BETTER_AUTH_SECRET: 'short' })).toThrow(
      /BETTER_AUTH_SECRET/,
    );
  });

  it('requires OAuth credentials in pairs', () => {
    expect(() => loadEnv({ ...required, GITHUB_CLIENT_ID: 'id' })).toThrow(/GITHUB_CLIENT_SECRET/);
    expect(
      loadEnv({ ...required, GITHUB_CLIENT_ID: 'id', GITHUB_CLIENT_SECRET: 's' }),
    ).toBeTruthy();
  });

  it('treats empty optional values as unset', () => {
    const env = loadEnv({ ...required, GITHUB_CLIENT_ID: '', GITHUB_CLIENT_SECRET: '' });
    expect(env.GITHUB_CLIENT_ID).toBeUndefined();
  });
});
