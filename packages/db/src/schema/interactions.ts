import { index, pgTable, primaryKey, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { actors } from './actors.ts';
import { id } from './columns.ts';
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

/**
 * Reposts (ActivityPub `Announce`). They have their own time-ordered id because they
 * appear in timelines at the moment of the repost, mixed with posts by id.
 */
export const reposts = pgTable(
  'reposts',
  {
    id: id(),
    actorId: uuid()
      .notNull()
      .references(() => actors.id, { onDelete: 'cascade' }),
    postId: uuid()
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (table) => [
    unique('reposts_actor_post_unique').on(table.actorId, table.postId),
    index().on(table.postId),
    // Timelines read a person's reposts newest first.
    index().on(table.actorId, table.id.desc()),
  ],
);
