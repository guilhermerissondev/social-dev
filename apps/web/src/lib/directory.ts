import 'server-only';

import type { Area, Seniority } from '@social-dev/shared';

import { apiFetch } from './api.ts';

export interface DirectoryEntry {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  area: Area | null;
  seniority: Seniority | null;
  location: string;
  technologies: string[];
  followersCount: number;
}

export interface DirectoryFilters {
  tech?: string | undefined;
  area?: Area | undefined;
  seniority?: Seniority | undefined;
  location?: string | undefined;
}

/** Query string with only the filters that are set. */
export function directoryQuery(filters: DirectoryFilters, cursor?: string): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === 'string' && value) query.set(key, value);
  }
  if (cursor) query.set('cursor', cursor);
  return query.size > 0 ? `?${query.toString()}` : '';
}

export async function getDirectory(
  filters: DirectoryFilters,
  cursor?: string,
): Promise<{ items: DirectoryEntry[]; nextCursor: string | null }> {
  const res = await apiFetch(`/api/directory${directoryQuery(filters, cursor)}`);
  if (!res.ok) throw new Error(`failed to load directory: ${res.status}`);
  return (await res.json()) as { items: DirectoryEntry[]; nextCursor: string | null };
}
