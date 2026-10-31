import createMiddleware from 'next-intl/middleware';

import { routing } from './i18n/routing.ts';

export default createMiddleware(routing);

export const config = {
  // Skip Next.js internals and files with an extension (images, fonts, ...).
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
