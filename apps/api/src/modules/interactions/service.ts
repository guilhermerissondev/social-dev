import { schema, type Database } from '@social-dev/db';
import { and, eq } from '@social-dev/db/orm';

import { notify, retract } from '../notifications/service.ts';

const { bookmarks, likes, posts } = schema;

export type InteractionKind = 'like' | 'bookmark';

const tables = { like: likes, bookmark: bookmarks } as const;

export type InteractionResult = 'ok' | 'not_found';

async function findAuthorId(db: Database, postId: string): Promise<string | null> {
  const [post] = await db
    .select({ authorId: posts.authorId })
    .from(posts)
    .where(eq(posts.id, postId));
  return post?.authorId ?? null;
}

/** Likes or saves a post. Doing it twice is not an error. Likes notify the author. */
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
    // Saves are private, so the author is never told about them.
    if (kind === 'like') await notify(tx, { recipientId: authorId, actorId, type: 'like', postId });
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
    if (kind === 'like')
      await retract(tx, { recipientId: authorId, actorId, type: 'like', postId });
  });
  return 'ok';
}
