import { index, pgTable, primaryKey, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { actors } from './actors.ts';
import { id } from './columns.ts';

/** Technology and topic tags (#typescript). Names are normalized by `normalizeTag`. */
export const tags = pgTable('tags', {
  id: id(),
  name: text().notNull().unique(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** The stack listed on a profile, in the order the person chose. */
export const actorTechnologies = pgTable(
  'actor_technologies',
  {
    actorId: uuid()
      .notNull()
      .references(() => actors.id, { onDelete: 'cascade' }),
    tagId: uuid()
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    position: smallint().notNull(),
  },
  (table) => [primaryKey({ columns: [table.actorId, table.tagId] }), index().on(table.tagId)],
);
