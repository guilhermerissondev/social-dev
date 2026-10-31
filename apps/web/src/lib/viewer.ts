import 'server-only';

import { getSessionUser } from './session.ts';

/**
 * Where buttons such as Follow and Like send people who cannot use them yet: visitors log
 * in, and accounts without a username choose one. Null when the viewer can act.
 */
export async function actionFallbackHref(): Promise<'/login' | '/welcome' | null> {
  const viewer = await getSessionUser();
  if (!viewer) return '/login';
  return viewer.username ? null : '/welcome';
}
