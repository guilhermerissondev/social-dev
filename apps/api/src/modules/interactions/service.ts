import { schema, type Database } from '@social-dev/db';
import { and, eq } from '@social-dev/db/orm';

import { notify, retract } from '../notifications/service.ts';

const { bookmarks, likes, posts, reposts } = schema;

export type InteractionKind = 'like' | 'bookmark' | 'repost';

const tables = { like: likes, bookmark: bookmarks, repost: reposts } as const;

// Saves are private, so the author is never told about them.
const notificationType = { like: 'like', repost: 'repost', bookmark: null } as const;

export type InteractionResult = 'ok' | 'not_found';

async function findAuthorId(db: Database, postId: string): Promise<string | null> {
  const [post] = await db
    .select({ authorId: posts.authorId })
    .from(posts)
    .where(eq(posts.id, postId));
  return post?.authorId ?? null;
}

/** Likes, saves or reposts a post. Doing it twice is not an error. */
export async function addInteraction(
  db: Database,
  kind: InteractionKind,
  actorId: string,
  postId: string,
): Promise<InteractionResult> {
  const authorId = await findAuthorId(db, postId);
  if (!authorId) return 'not_found';

  await db.transaction(async (tx) => {
    await tx.insert(tables[kind]).values({ actorId, postId }).onConflictDoNothing();
    const type = notificationType[kind];
    if (type) await notify(tx, { recipientId: authorId, actorId, type, postId });
  });
  return 'ok';
}

export async function removeInteraction(
  db: Database,
  kind: InteractionKind,
  actorId: string,
  postId: string,
): Promise<InteractionResult> {
  const authorId = await findAuthorId(db, postId);
  if (!authorId) return 'not_found';

  const table = tables[kind];
  await db.transaction(async (tx) => {
    await tx.delete(table).where(and(eq(table.actorId, actorId), eq(table.postId, postId)));
    const type = notificationType[kind];
    if (type) await retract(tx, { recipientId: authorId, actorId, type, postId });
  });
  return 'ok';
}
