import { boolean, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { actors } from './actors.ts';

export interface PinnedRepo {
  name: string;
  nameWithOwner: string;
  description: string | null;
  url: string;
  stars: number;
  language: { name: string; color: string | null } | null;
}

/**
 * Public data read from a person's GitHub account. Refreshed from the GitHub API at most
 * every few minutes; see apps/api/src/modules/github.
 */
export const githubProfiles = pgTable('github_profiles', {
  actorId: uuid()
    .primaryKey()
    .references(() => actors.id, { onDelete: 'cascade' }),
  login: text().notNull(),
  pinnedRepos: jsonb().$type<PinnedRepo[]>().notNull().default([]),
  /** Whether the profile shows the GitHub login and pinned repositories. */
  showOnProfile: boolean().notNull().default(true),
  fetchedAt: timestamp({ withTimezone: true }).notNull(),
});
