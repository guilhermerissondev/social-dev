import 'server-only';

import { apiFetch } from './api.ts';
import type { PostPage } from './posts.ts';

export const explorePeriods = ['day', 'week', 'month'] as const;
export type ExplorePeriod = (typeof explorePeriods)[number];

export function isExplorePeriod(value: string | undefined): value is ExplorePeriod {
  return explorePeriods.some((period) => period === value);
}

export async function getPopularPosts(
  period: ExplorePeriod,
  tag?: string,
  cursor?: string,
): Promise<PostPage> {
  const query = new URLSearchParams({ period });
  if (tag) query.set('tag', tag);
  if (cursor) query.set('cursor', cursor);
  const res = await apiFetch(`/api/explore/posts?${query.toString()}`);
  if (!res.ok) throw new Error(`failed to load explore posts: ${res.status}`);
  return (await res.json()) as PostPage;
}

export async function getTrendingTags(
  period: ExplorePeriod,
): Promise<{ name: string; postsCount: number }[]> {
  const res = await apiFetch(`/api/explore/tags?period=${period}`);
  if (!res.ok) throw new Error(`failed to load trending tags: ${res.status}`);
  return ((await res.json()) as { items: { name: string; postsCount: number }[] }).items;
}
