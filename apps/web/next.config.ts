import { existsSync } from 'node:fs';

import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// Share the monorepo's root .env with the web app (Next.js only reads apps/web/.env by default).
const rootEnv = new URL('../../.env', import.meta.url);
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const apiUrl = process.env.API_URL ?? 'http://localhost:4000';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  transpilePackages: ['@social-dev/ui'],
  typedRoutes: true,
  // The browser only talks to the web origin; API calls are proxied so auth cookies stay first-party.
  rewrites: () => Promise.resolve([{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }]),
};

export default withNextIntl(nextConfig);
