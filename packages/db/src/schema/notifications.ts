import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { actors } from './actors.ts';
import { id } from './columns.ts';
import { posts } from './posts.ts';

/** Kinds of notification. Later M3 steps add reposts and mentions. */
export const notificationTypes = ['follow', 'like', 'reply'] as const;
export type NotificationType = (typeof notificationTypes)[number];

/**
 * In-app notifications. One row per (recipient, actor, type, post): repeating an action
 * does not notify twice, and undoing it removes the notification.
 */
export const notifications = pgTable(
  'notifications',
  {
    id: id(),
    recipientId: uuid()
      .notNull()
      .references(() => actors.id, { onDelete: 'cascade' }),
    /** Who did it. */
    actorId: uuid()
      .notNull()
      .references(() => actors.id, { onDelete: 'cascade' }),
    type: text({ enum: notificationTypes }).notNull(),
    /** The post it is about. Null for follows. */
    postId: uuid().references(() => posts.id, { onDelete: 'cascade' }),
    readAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('notifications_event_unique')
      .on(table.recipientId, table.actorId, table.type, table.postId)
      .nullsNotDistinct(),
    index().on(table.recipientId, table.id.desc()),
    // Unread count in the header.
    index('notifications_unread_index')
      .on(table.recipientId)
      .where(sql`${table.readAt} is null`),
  ],
);
