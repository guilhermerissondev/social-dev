import { schema, type Database, type Executor, type NotificationType } from '@social-dev/db';
import { alias } from '@social-dev/db/pg-core';
import { and, count, desc, eq, isNull, lt, lte, sql } from '@social-dev/db/orm';
import { plainExcerpt } from '@social-dev/shared';

const { actors, notifications, posts, users } = schema;

export const NOTIFICATIONS_PAGE_SIZE = 30;

interface NotificationEvent {
  recipientId: string;
  /** Who did it. */
  actorId: string;
  type: NotificationType;
  postId?: string | null;
}

/**
 * Records a notification. Nobody is notified about their own actions, and repeating an
 * action does not notify twice. Call it in the same transaction as the action.
 */
export async function notify(db: Executor, event: NotificationEvent): Promise<void> {
  if (event.recipientId === event.actorId) return;
  await db
    .insert(notifications)
    .values({ ...event, postId: event.postId ?? null })
    .onConflictDoNothing();
}

/** Removes the notification for an action that was undone (unfollow, unlike). */
export async function retract(db: Executor, event: NotificationEvent): Promise<void> {
  await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.recipientId, event.recipientId),
        eq(notifications.actorId, event.actorId),
        eq(notifications.type, event.type),
        event.postId ? eq(notifications.postId, event.postId) : isNull(notifications.postId),
      ),
    );
}

export interface NotificationView {
  id: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  actor: { username: string; displayName: string; avatarUrl: string | null };
  post: { id: string; authorUsername: string; title: string | null; excerpt: string } | null;
}

export interface NotificationPage {
  items: NotificationView[];
  nextCursor: string | null;
}

/** The recipient's notifications, newest first. */
export async function listNotifications(
  db: Database,
  recipientId: string,
  before?: string,
): Promise<NotificationPage> {
  const postAuthors = alias(actors, 'post_authors');
  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
      actorUsername: actors.username,
      actorDisplayName: actors.displayName,
      actorAvatarUrl: users.image,
      postId: posts.id,
      postTitle: posts.title,
      postContent: posts.content,
      postAuthorUsername: postAuthors.username,
    })
    .from(notifications)
    .innerJoin(actors, eq(actors.id, notifications.actorId))
    .leftJoin(users, eq(users.id, actors.userId))
    .leftJoin(posts, eq(posts.id, notifications.postId))
    .leftJoin(postAuthors, eq(postAuthors.id, posts.authorId))
    .where(
      and(
        eq(notifications.recipientId, recipientId),
        before ? lt(notifications.id, before) : undefined,
      ),
    )
    .orderBy(desc(notifications.id))
    .limit(NOTIFICATIONS_PAGE_SIZE + 1);

  const items = rows.slice(0, NOTIFICATIONS_PAGE_SIZE).map((row): NotificationView => ({
    id: row.id,
    type: row.type,
    read: row.readAt !== null,
    createdAt: row.createdAt.toISOString(),
    actor: {
      username: row.actorUsername,
      displayName: row.actorDisplayName,
      avatarUrl: row.actorAvatarUrl,
    },
    post:
      row.postId && row.postAuthorUsername && row.postContent !== null
        ? {
            id: row.postId,
            authorUsername: row.postAuthorUsername,
            title: row.postTitle,
            excerpt: plainExcerpt(row.postContent, 120),
          }
        : null,
  }));
  return {
    items,
    nextCursor: rows.length > NOTIFICATIONS_PAGE_SIZE ? (items.at(-1)?.id ?? null) : null,
  };
}

export async function countUnread(db: Database, recipientId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.recipientId, recipientId), isNull(notifications.readAt)));
  return row?.value ?? 0;
}

/**
 * Marks notifications up to `upTo` (inclusive) as read. Taking the newest id the person
 * actually saw keeps notifications that arrived meanwhile unread.
 */
export async function markRead(db: Database, recipientId: string, upTo: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: sql`now()` })
    .where(
      and(
        eq(notifications.recipientId, recipientId),
        isNull(notifications.readAt),
        lte(notifications.id, upTo),
      ),
    );
}
