import 'server-only';

import { getSessionUser } from './session.ts';

/**
 * Where a "Follow" button sends people who cannot follow yet: visitors log in, and
 * accounts without a username choose one. Null when the viewer can follow.
 */
export async function followFallbackHref(): Promise<'/login' | '/welcome' | null> {
  const viewer = await getSessionUser();
  if (!viewer) return '/login';
  return viewer.username ? null : '/welcome';
}
