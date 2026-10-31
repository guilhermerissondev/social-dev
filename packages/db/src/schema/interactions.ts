import { index, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';

import { actors } from './actors.ts';
import { posts } from './posts.ts';

// Millisecond precision so timestamps round-trip through a JavaScript Date in list cursors.
const createdAt = () => timestamp({ withTimezone: true, precision: 3 }).notNull().defaultNow();

/** Likes. Public: they become ActivityPub `Like` activities in M5. */
export const likes = pgTable(
  'likes',
  {
    actorId: uuid()
      .notNull()
      .references(() => actors.id, { onDelete: 'cascade' }),
    postId: uuid()
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (table) => [primaryKey({ columns: [table.actorId, table.postId] }), index().on(table.postId)],
);

/** Saved posts. Private to the person who saved them and never federated. */
export const bookmarks = pgTable(
  'bookmarks',
  {
    actorId: uuid()
      .notNull()
      .references(() => actors.id, { onDelete: 'cascade' }),
    postId: uuid()
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.actorId, table.postId] }),
    // The "Saved" page lists the most recently saved first.
    index().on(table.actorId, table.createdAt.desc()),
  ],
);
