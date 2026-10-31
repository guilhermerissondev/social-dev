import 'server-only';

import { apiFetch } from './api.ts';
import type { PostPage } from './posts.ts';
import type { ProfileSummary } from './profiles.ts';

export const searchTypes = ['all', 'people', 'posts', 'tags'] as const;
export type SearchType = (typeof searchTypes)[number];

export function isSearchType(value: string | undefined): value is SearchType {
  return searchTypes.some((type) => type === value);
}

export interface SearchResults {
  people: ProfileSummary[];
  tags: { name: string; postsCount: number }[];
  posts: PostPage;
}

export async function search(q: string, type: SearchType, cursor?: string): Promise<SearchResults> {
  const query = new URLSearchParams({ q, type });
  if (cursor) query.set('cursor', cursor);
  const res = await apiFetch(`/api/search?${query.toString()}`);
  if (!res.ok) throw new Error(`search failed: ${res.status}`);
  return (await res.json()) as SearchResults;
}
