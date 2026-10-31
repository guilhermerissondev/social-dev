import { defineConfig, devices } from '@playwright/test';

const WEB_URL = 'http://localhost:3000';
const isCI = Boolean(process.env.CI);

/**
 * End-to-end tests run the real API and web app against the services from
 * infra/docker-compose.yml (PostgreSQL and Mailpit). Run `pnpm services:up` and
 * `pnpm db:migrate` first.
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/warm-up.ts',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  // The dev server compiles pages on first visit, which can take a few seconds.
  expect: { timeout: 15_000 },
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: WEB_URL,
    locale: 'pt-BR',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // Locally an API that is already running is reused. Start it with AUTH_RATE_LIMIT=false,
      // or the many sign-ups in the suite hit the auth rate limit (HTTP 429).
      command: 'pnpm --filter @social-dev/api start',
      url: 'http://localhost:4000/health',
      env: { AUTH_RATE_LIMIT: 'false' },
      reuseExistingServer: !isCI,
    },
    {
      command: isCI ? 'pnpm build && pnpm start' : 'pnpm dev',
      url: WEB_URL,
      timeout: 180_000,
      reuseExistingServer: !isCI,
    },
  ],
});
