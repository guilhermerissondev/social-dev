import { index, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { actors } from './actors.ts';
import { id, timestamps } from './columns.ts';
import { tags } from './tags.ts';

/**
 * A post: Markdown written by the author plus the sanitized HTML rendered from it.
 * Ids are UUIDv7, so ordering by id is ordering by creation time.
 * See docs/adr/0003-modelo-de-conteudo.md.
 */
export const posts = pgTable(
  'posts',
  {
    id: id(),
    authorId: uuid()
      .notNull()
      .references(() => actors.id, { onDelete: 'cascade' }),
    /** Optional. Posts with a title federate as Article, the rest as Note. */
    title: text(),
    content: text().notNull(),
    contentHtml: text().notNull(),
    /** Set when the author changes the content after publishing. */
    editedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (table) => [index().on(table.authorId, table.id.desc())],
);

/** Hashtags used in a post. */
export const postTags = pgTable(
  'post_tags',
  {
    postId: uuid()
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tagId: uuid()
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.tagId] }),
    // Tag pages and the tag part of the feed list posts of a tag, newest first.
    index().on(table.tagId, table.postId.desc()),
  ],
);
