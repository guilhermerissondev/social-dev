import { sql } from 'drizzle-orm';
import { check, index, jsonb, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { AREAS, SENIORITIES } from '@social-dev/shared';

import { id, timestamps } from './columns.ts';
import { users } from './identity.ts';

/** "('a', 'b')" for a check constraint. Only for constant lists defined in code. */
function sqlList(values: readonly string[]): string {
  return `(${values.map((value) => `'${value}'`).join(', ')})`;
}

export interface ActorLink {
  label: string;
  url: string;
}

/**
 * Public identity of a person: the profile shown on the site and, from M5 on, the
 * ActivityPub actor. Local actors belong to a user and have no domain; remote actors
 * (other fediverse servers) have a domain and no user. See docs/adr/0007-atores-e-perfis.md.
 */
export const actors = pgTable(
  'actors',
  {
    id: id(),
    userId: uuid()
      .unique('actors_user_id_unique')
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Handle with the case the person chose. Compared case-insensitively. */
    username: text().notNull(),
    /** Null for local actors. The local domain comes from configuration, never the database. */
    domain: text(),
    displayName: text().notNull(),
    bio: text().notNull().default(''),
    location: text().notNull().default(''),
    area: text({ enum: AREAS }),
    seniority: text({ enum: SENIORITIES }),
    links: jsonb().$type<ActorLink[]>().notNull().default([]),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('actors_local_username_unique')
      .on(sql`lower(${table.username})`)
      .where(sql`${table.domain} is null`),
    uniqueIndex('actors_remote_username_unique')
      .on(sql`lower(${table.username})`, table.domain)
      .where(sql`${table.domain} is not null`),
    check('actors_local_or_remote', sql`(${table.domain} is null) = (${table.userId} is not null)`),
    check('actors_area_valid', sql`${table.area} in ${sql.raw(sqlList(AREAS))}`),
    check('actors_seniority_valid', sql`${table.seniority} in ${sql.raw(sqlList(SENIORITIES))}`),
    // The directory filters by area and seniority.
    index().on(table.area),
    index().on(table.seniority),
    // People search matches parts of usernames and names (trigrams), ignoring case.
    index('actors_username_trgm_index').using('gin', sql`lower(${table.username}) gin_trgm_ops`),
    index('actors_display_name_trgm_index').using(
      'gin',
      sql`lower(${table.displayName}) gin_trgm_ops`,
    ),
  ],
);
