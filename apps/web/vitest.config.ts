import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Playwright specs in e2e/ run separately with `pnpm test:e2e`.
    include: ['test/**/*.test.ts'],
  },
});
