import { schema, type Database, type Executor } from '@social-dev/db';
import { and, desc, eq, exists, inArray, isNull, lt, or, sql, type SQL } from '@social-dev/db/orm';
import { renderMarkdown } from '@social-dev/markdown';
import { POST_LIMITS, type PostInput } from '@social-dev/shared';

import { decodeCursor, encodeCursor } from '../../lib/cursor.ts';
import { notify } from '../notifications/service.ts';
import { isLocalUsername } from '../profiles/service.ts';
import { upsertTags } from '../tags/service.ts';

const { actors, bookmarks, follows, likes, posts, postTags, tagFollows, tags, users } = schema;

export const PAGE_SIZE = 20;

export interface PostView {
  id: string;
  title: string | null;
  /** Markdown source, used when editing. */
  content: string;
  /** Sanitized HTML rendered from `content`. */
  contentHtml: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  createdAt: string;
  editedAt: string | null;
  /** The post this one answers, if it still exists. */
  replyTo: { id: string; authorUsername: string } | null;
  /** First post of the conversation, for replies. Null for top-level posts. */
  threadId: string | null;
  /** Replies in the conversation for a top-level post; direct replies for a reply. */
  repliesCount: number;
  likesCount: number;
  /** Whether the signed-in viewer liked or saved the post. False for visitors. */
  likedByViewer: boolean;
  bookmarkedByViewer: boolean;
}

export interface PostPage {
  items: PostView[];
  /** Pass as `before` to get the next (older) page. Null on the last page. */
  nextCursor: string | null;
}

export type PostFilter =
  | { kind: 'author'; username: string }
  | { kind: 'tag'; name: string }
  /** The "Following" feed: the actor's own posts, people they follow and tags they follow. */
  | { kind: 'feed'; actorId: string };

function postColumns(viewerId: string | null) {
  return {
    id: posts.id,
    title: posts.title,
    content: posts.content,
    contentHtml: posts.contentHtml,
    createdAt: posts.createdAt,
    editedAt: posts.editedAt,
    authorId: actors.id,
    authorUsername: actors.username,
    authorDisplayName: actors.displayName,
    authorAvatarUrl: users.image,
    replyToId: posts.replyToId,
    threadId: posts.threadId,
    replyToAuthorUsername: sql<string | null>`(select a.username from ${actors} as a
      inner join ${posts} as parent on parent.author_id = a.id where parent.id = ${posts.replyToId})`,
    // Counted on read; stored counters can come when lists get large.
    repliesCount: sql<number>`(select count(*) from ${posts} as replies
      where replies.thread_id = ${posts.id} or replies.reply_to_id = ${posts.id})::int`,
    likesCount: sql<number>`(select count(*) from ${likes} where ${likes.postId} = ${posts.id})::int`,
    likedByViewer: viewerId
      ? sql<boolean>`exists(select 1 from ${likes} where ${likes.postId} = ${posts.id} and ${likes.actorId} = ${viewerId})`
      : sql<boolean>`false`,
    bookmarkedByViewer: viewerId
      ? sql<boolean>`exists(select 1 from ${bookmarks} where ${bookmarks.postId} = ${posts.id} and ${bookmarks.actorId} = ${viewerId})`
      : sql<boolean>`false`,
  };
}

function selectPosts(db: Executor, viewerId: string | null) {
  return db
    .select(postColumns(viewerId))
    .from(posts)
    .innerJoin(actors, eq(actors.id, posts.authorId))
    .leftJoin(users, eq(users.id, actors.userId));
}

type PostRow = Awaited<ReturnType<typeof selectPosts>>[number];

function toView(row: PostRow): PostView {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    contentHtml: row.contentHtml,
    author: {
      id: row.authorId,
      username: row.authorUsername,
      displayName: row.authorDisplayName,
      avatarUrl: row.authorAvatarUrl,
    },
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt?.toISOString() ?? null,
    replyTo:
      row.replyToId && row.replyToAuthorUsername
        ? { id: row.replyToId, authorUsername: row.replyToAuthorUsername }
        : null,
    threadId: row.threadId,
    repliesCount: row.repliesCount,
    likesCount: row.likesCount,
    likedByViewer: row.likedByViewer,
    bookmarkedByViewer: row.bookmarkedByViewer,
  };
}

/** Empty titles are stored as no title. */
function titleOf(input: PostInput): string | null {
  return input.title === '' ? null : (input.title ?? null);
}

/** Replaces the post's hashtags. */
async function saveTags(tx: Executor, postId: string, names: string[]) {
  await tx.delete(postTags).where(eq(postTags.postId, postId));
  const tagIds = await upsertTags(tx, names.slice(0, POST_LIMITS.tags));
  if (tagIds.length > 0) {
    await tx.insert(postTags).values(tagIds.map((tagId) => ({ postId, tagId })));
  }
}

export type CreatePostResult = { id: string } | 'parent_not_found';

/**
 * Publishes a post, or a reply when `replyToId` is set. Replies have no title and notify
 * the author of the post they answer.
 */
export async function createPost(
  db: Database,
  authorId: string,
  input: PostInput,
  replyToId?: string,
): Promise<CreatePostResult> {
  const rendered = renderMarkdown(input.content);
  return db.transaction(async (tx) => {
    let parent: { authorId: string; threadId: string } | null = null;
    if (replyToId) {
      const [row] = await tx
        .select({ authorId: posts.authorId, id: posts.id, threadId: posts.threadId })
        .from(posts)
        .where(eq(posts.id, replyToId));
      if (!row) return 'parent_not_found';
      parent = { authorId: row.authorId, threadId: row.threadId ?? row.id };
    }

    const [post] = await tx
      .insert(posts)
      .values({
        authorId,
        title: parent ? null : titleOf(input),
        content: input.content,
        contentHtml: rendered.html,
        replyToId: replyToId ?? null,
        threadId: parent?.threadId ?? null,
      })
      .returning({ id: posts.id });
    if (!post) throw new Error('post was not created');

    await saveTags(tx, post.id, rendered.tags);
    if (parent) {
      await notify(tx, {
        recipientId: parent.authorId,
        actorId: authorId,
        type: 'reply',
        postId: post.id,
      });
    }
    return { id: post.id };
  });
}

export type OwnPostResult = 'ok' | 'not_found' | 'forbidden';

async function checkOwner(db: Executor, postId: string, authorId: string): Promise<OwnPostResult> {
  const [post] = await db
    .select({ authorId: posts.authorId })
    .from(posts)
    .where(eq(posts.id, postId));
  if (!post) return 'not_found';
  return post.authorId === authorId ? 'ok' : 'forbidden';
}

export async function updatePost(
  db: Database,
  postId: string,
  authorId: string,
  input: PostInput,
): Promise<OwnPostResult> {
  const rendered = renderMarkdown(input.content);
  return db.transaction(async (tx) => {
    const access = await checkOwner(tx, postId, authorId);
    if (access !== 'ok') return access;

    await tx
      .update(posts)
      .set({
        // Replies never have a title.
        title: sql`case when ${posts.threadId} is null then ${titleOf(input)}::text end`,
        content: input.content,
        contentHtml: rendered.html,
        editedAt: new Date(),
      })
      .where(eq(posts.id, postId));
    await saveTags(tx, postId, rendered.tags);
    return 'ok';
  });
}

export async function deletePost(
  db: Database,
  postId: string,
  authorId: string,
): Promise<OwnPostResult> {
  const access = await checkOwner(db, postId, authorId);
  if (access !== 'ok') return access;
  await db.delete(posts).where(eq(posts.id, postId));
  return 'ok';
}

export async function getPost(
  db: Database,
  postId: string,
  viewerId: string | null,
): Promise<PostView | null> {
  const [row] = await selectPosts(db, viewerId).where(eq(posts.id, postId));
  return row ? toView(row) : null;
}

/** Lists show conversation starts; replies are read on the post page. */
function filterCondition(filter: PostFilter): SQL | undefined {
  return and(isNull(posts.threadId), matchCondition(filter));
}

function matchCondition(filter: PostFilter): SQL | undefined {
  switch (filter.kind) {
    case 'author':
      return isLocalUsername(filter.username);
    case 'tag':
      return exists(
        sql`(select 1 from ${postTags} inner join ${tags} on ${tags.id} = ${postTags.tagId}
          where ${postTags.postId} = ${posts.id} and ${tags.name} = ${filter.name})`,
      );
    case 'feed':
      // Built on read for now; precomputed timelines come when the volume asks for them
      // (docs/plano-inicial.md, section 6.3).
      return or(
        eq(posts.authorId, filter.actorId),
        inArray(
          posts.authorId,
          sql`(select ${follows.followeeId} from ${follows} where ${follows.followerId} = ${filter.actorId})`,
        ),
        exists(
          sql`(select 1 from ${postTags} inner join ${tagFollows} on ${tagFollows.tagId} = ${postTags.tagId}
            where ${postTags.postId} = ${posts.id} and ${tagFollows.actorId} = ${filter.actorId})`,
        ),
      );
  }
}

/** Newest posts matching the filter, one page at a time. */
export async function listPosts(
  db: Database,
  filter: PostFilter,
  {
    before,
    viewerId = null,
    limit = PAGE_SIZE,
  }: { before?: string | undefined; viewerId?: string | null; limit?: number } = {},
): Promise<PostPage> {
  const rows = await selectPosts(db, viewerId)
    .where(and(filterCondition(filter), before ? lt(posts.id, before) : undefined))
    .orderBy(desc(posts.id))
    .limit(limit + 1);

  const items = rows.slice(0, limit).map(toView);
  return { items, nextCursor: rows.length > limit ? (items.at(-1)?.id ?? null) : null };
}

/** Posts the actor saved, most recently saved first. Only ever shown to that actor. */
export async function listBookmarkedPosts(
  db: Database,
  actorId: string,
  cursorValue?: string,
): Promise<PostPage> {
  const cursor = cursorValue ? decodeCursor(cursorValue) : null;
  const rows = await db
    .select({ ...postColumns(actorId), savedAt: bookmarks.createdAt })
    .from(bookmarks)
    .innerJoin(posts, eq(posts.id, bookmarks.postId))
    .innerJoin(actors, eq(actors.id, posts.authorId))
    .leftJoin(users, eq(users.id, actors.userId))
    .where(
      and(
        eq(bookmarks.actorId, actorId),
        cursor
          ? or(
              lt(bookmarks.createdAt, new Date(cursor.at)),
              and(eq(bookmarks.createdAt, new Date(cursor.at)), lt(posts.id, cursor.id)),
            )
          : undefined,
      ),
    )
    .orderBy(desc(bookmarks.createdAt), desc(posts.id))
    .limit(PAGE_SIZE + 1);

  const page = rows.slice(0, PAGE_SIZE);
  const last = page.at(-1);
  return {
    items: page.map(toView),
    nextCursor:
      rows.length > PAGE_SIZE && last
        ? encodeCursor({ at: last.savedAt.toISOString(), id: last.id })
        : null,
  };
}

export const THREAD_LIMIT = 500;

/**
 * Every reply in the conversation started by `rootId`, oldest first, so the page can build
 * the tree from `replyTo`. Capped; paging long conversations comes when they exist.
 */
export async function listThread(
  db: Database,
  rootId: string,
  viewerId: string | null,
): Promise<PostView[]> {
  const rows = await selectPosts(db, viewerId)
    .where(eq(posts.threadId, rootId))
    .orderBy(posts.id)
    .limit(THREAD_LIMIT);
  return rows.map(toView);
}
