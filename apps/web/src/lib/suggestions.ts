import 'server-only';

import { apiFetch } from './api.ts';
import type { ProfileSummary } from './profiles.ts';

export interface PersonSuggestion extends ProfileSummary {
  sharedTechnologies: string[];
  followedByFollowing: number;
}

export async function getPeopleSuggestions(limit: number): Promise<PersonSuggestion[]> {
  const res = await apiFetch(`/api/me/suggestions/people?limit=${limit}`);
  if (!res.ok) throw new Error(`failed to load suggestions: ${res.status}`);
  return ((await res.json()) as { items: PersonSuggestion[] }).items;
}

export async function getTagSuggestions(limit: number): Promise<string[]> {
  const res = await apiFetch(`/api/me/suggestions/tags?limit=${limit}`);
  if (!res.ok) throw new Error(`failed to load tag suggestions: ${res.status}`);
  return ((await res.json()) as { items: string[] }).items;
}
