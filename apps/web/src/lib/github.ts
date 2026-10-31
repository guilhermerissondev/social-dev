import 'server-only';

import { apiFetch } from './api.ts';
import type { ProfileSummary } from './profiles.ts';

export interface PinnedRepo {
  name: string;
  nameWithOwner: string;
  description: string | null;
  url: string;
  stars: number;
  language: { name: string; color: string | null } | null;
}

export interface GitHubStatus {
  connected: boolean;
  login: string | null;
  showOnProfile: boolean;
  pinnedRepos: PinnedRepo[];
  fetchedAt: string | null;
}

export interface GitHubFollow extends ProfileSummary {
  followedByViewer: boolean;
}

/** The viewer's GitHub connection (the API refreshes it from GitHub when it is old). */
export async function getGitHubStatus(): Promise<GitHubStatus> {
  const res = await apiFetch('/api/me/github');
  if (!res.ok) throw new Error(`failed to load GitHub status: ${res.status}`);
  return (await res.json()) as GitHubStatus;
}

/**
 * People on Social Dev the viewer follows on GitHub. Null when GitHub is not connected or
 * did not answer: callers just leave the section out.
 */
export async function getGitHubFollows(): Promise<GitHubFollow[] | null> {
  const res = await apiFetch('/api/me/github/following');
  if (res.status === 404 || res.status === 502) return null;
  if (!res.ok) throw new Error(`failed to load GitHub follows: ${res.status}`);
  return ((await res.json()) as { items: GitHubFollow[] }).items;
}
