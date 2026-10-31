import { sql } from 'drizzle-orm';
import { check, index, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';

import { actors } from './actors.ts';
import { tags } from './tags.ts';

/** Who follows whom. Both sides are actors, so remote follows (M5) fit the same table. */
export const follows = pgTable(
  'follows',
  {
    followerId: uuid()
      .notNull()
      .references(() => actors.id, { onDelete: 'cascade' }),
    followeeId: uuid()
      .notNull()
      .references(() => actors.id, { onDelete: 'cascade' }),
    // Millisecond precision so the value round-trips through a JavaScript Date in list cursors.
    createdAt: timestamp({ withTimezone: true, precision: 3 }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.followerId, table.followeeId] }),
    // Followers of an account, most recent first.
    index().on(table.followeeId, table.createdAt.desc()),
    // Following lists, most recent first. Also serves the feed's "who do I follow".
    index().on(table.followerId, table.createdAt.desc()),
    check('follows_not_self', sql`${table.followerId} <> ${table.followeeId}`),
  ],
);

/** Tags an actor follows. Posts with these tags show up in the feed. */
export const tagFollows = pgTable(
  'tag_follows',
  {
    actorId: uuid()
      .notNull()
      .references(() => actors.id, { onDelete: 'cascade' }),
    tagId: uuid()
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.actorId, table.tagId] }), index().on(table.tagId)],
);
