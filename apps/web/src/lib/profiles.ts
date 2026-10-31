import 'server-only';

import type { Area, Seniority } from '@social-dev/shared';
import { cache } from 'react';

import { apiFetch } from './api.ts';
import type { PinnedRepo } from './github.ts';

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  location: string;
  area: Area | null;
  seniority: Seniority | null;
  links: { label: string; url: string }[];
  technologies: string[];
  avatarUrl: string | null;
  createdAt: string;
  followersCount: number;
  followingCount: number;
  followedByViewer: boolean;
  /** Only when the owner chose to show it. */
  github: { login: string; pinnedRepos: PinnedRepo[] } | null;
}

export interface ProfileSummary {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
}

export interface ProfilePage {
  items: ProfileSummary[];
  nextCursor: string | null;
}

/** Public profile by handle, or null when it does not exist. Cached per request. */
export const getProfile = cache(async (username: string): Promise<Profile | null> => {
  const res = await apiFetch(`/api/profiles/${encodeURIComponent(username)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`failed to load profile: ${res.status}`);
  return (await res.json()) as Profile;
});

/** Followers or followed accounts of a profile. Null when the profile does not exist. */
export async function listFollows(
  username: string,
  direction: 'followers' | 'following',
  cursor?: string,
): Promise<ProfilePage | null> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  const res = await apiFetch(`/api/profiles/${encodeURIComponent(username)}/${direction}${query}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`failed to load ${direction}: ${res.status}`);
  return (await res.json()) as ProfilePage;
}
