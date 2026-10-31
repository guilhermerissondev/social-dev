import 'server-only';

import { apiFetch } from './api.ts';

export interface TagInfo {
  name: string;
  followersCount: number;
  followedByViewer: boolean;
}

export async function getTag(name: string): Promise<TagInfo | null> {
  const res = await apiFetch(`/api/tags/${encodeURIComponent(name)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`failed to load tag: ${res.status}`);
  return (await res.json()) as TagInfo;
}
