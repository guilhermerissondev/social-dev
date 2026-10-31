/**
 * Playwright global setup. The Next.js dev server compiles each route on its first visit,
 * which can take longer than a test's timeout when the machine is busy and several tests
 * hit new routes at once. Visiting every route once, one at a time, gets that out of the
 * way. Production builds (CI) are already compiled, so this is quick there.
 */
const WEB_URL = 'http://localhost:3000';

// One path per route. Dynamic segments get placeholder values; a 404 still compiles the route.
const routes = [
  '/',
  '/en',
  '/login',
  '/signup',
  '/check-email',
  '/forgot-password',
  '/reset-password',
  '/welcome',
  '/home',
  '/saved',
  '/notifications',
  '/settings/profile',
  '/tags/warmup',
  '/@warmup',
  '/@warmup/followers',
  '/@warmup/following',
  '/@warmup/00000000-0000-7000-8000-000000000000',
  '/@warmup/00000000-0000-7000-8000-000000000000/edit',
];

export default async function warmUp() {
  for (const route of routes) {
    // Redirects (signed-out visitors) still compile the route they come from.
    await fetch(`${WEB_URL}${route}`, { redirect: 'manual' });
  }
}
