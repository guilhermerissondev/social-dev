import 'server-only';

import { cache } from 'react';

import { apiFetch } from './api.ts';

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  location: string;
  links: { label: string; url: string }[];
  technologies: string[];
  avatarUrl: string | null;
  createdAt: string;
}

/** Public profile by handle, or null when it does not exist. Cached per request. */
export const getProfile = cache(async (username: string): Promise<Profile | null> => {
  const res = await apiFetch(`/api/profiles/${encodeURIComponent(username)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`failed to load profile: ${res.status}`);
  return (await res.json()) as Profile;
});
