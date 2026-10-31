import { schema, type Database } from '@social-dev/db';
import { and, eq } from '@social-dev/db/orm';

const { bookmarks, likes, posts } = schema;

type Interaction = typeof likes | typeof bookmarks;

export type InteractionResult = 'ok' | 'not_found';

async function postExists(db: Database, postId: string): Promise<boolean> {
  const [post] = await db.select({ id: posts.id }).from(posts).where(eq(posts.id, postId));
  return Boolean(post);
}

/** Adds a like or bookmark. Doing it twice is not an error. */
export async function addInteraction(
  db: Database,
  table: Interaction,
  actorId: string,
  postId: string,
): Promise<InteractionResult> {
  if (!(await postExists(db, postId))) return 'not_found';
  await db.insert(table).values({ actorId, postId }).onConflictDoNothing();
  return 'ok';
}

export async function removeInteraction(
  db: Database,
  table: Interaction,
  actorId: string,
  postId: string,
): Promise<InteractionResult> {
  if (!(await postExists(db, postId))) return 'not_found';
  await db.delete(table).where(and(eq(table.actorId, actorId), eq(table.postId, postId)));
  return 'ok';
}

export const interactionTables = { like: likes, bookmark: bookmarks } as const;
