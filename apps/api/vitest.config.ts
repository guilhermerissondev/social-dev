import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['@social-dev/db/testing/global-setup'],
    hookTimeout: 120_000,
  },
});
