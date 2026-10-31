import 'server-only';

import { cache } from 'react';

import { apiFetch } from './api.ts';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  username: string | null;
  displayUsername: string | null;
  image: string | null;
}

/** The signed-in user for the current request, or null. Cached per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const res = await apiFetch('/api/auth/get-session');
  if (!res.ok) return null;
  const body = (await res.json()) as { user: SessionUser } | null;
  return body?.user ?? null;
});

export type OAuthProvider = 'github' | 'gitlab';

export async function getAuthProviders(): Promise<OAuthProvider[]> {
  const res = await apiFetch('/api/auth-providers');
  if (!res.ok) return [];
  return ((await res.json()) as { providers: OAuthProvider[] }).providers;
}
