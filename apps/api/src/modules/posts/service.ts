import { schema, type Database, type Executor } from '@social-dev/db';
import { and, desc, eq, exists, inArray, isNull, lt, or, sql, type SQL } from '@social-dev/db/orm';
import { alias } from '@social-dev/db/pg-core';
import { findMentions, renderMarkdown } from '@social-dev/markdown';
import { POST_LIMITS, type PostInput } from '@social-dev/shared';

import { decodeCursor, encodeCursor } from '../../lib/cursor.ts';
import { notify, retract } from '../notifications/service.ts';
import { isLocalUsername } from '../profiles/service.ts';
import { upsertTags } from '../tags/service.ts';

const {
  actors,
  bookmarks,
  follows,
  likes,
  postMentions,
  posts,
  postTags,
  reposts,
  tagFollows,
  tags,
  users,
} = schema;

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
  repostsCount: number;
  /** Whether the signed-in viewer liked, saved or reposted the post. False for visitors. */
  likedByViewer: boolean;
  bookmarkedByViewer: boolean;
  repostedByViewer: boolean;
}

/** A post as it appears in a list: on its own, or reposted by someone. */
export interface TimelineEntry extends PostView {
  /** The post id, or the repost id for reposts. Unique within a list and used as the cursor. */
  entryId: string;
  repostedBy: { username: string; displayName: string } | null;
}

export interface PostPage {
  items: TimelineEntry[];
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
    repostsCount: sql<number>`(select count(*) from ${reposts} where ${reposts.postId} = ${posts.id})::int`,
    repostedByViewer: viewerId
      ? sql<boolean>`exists(select 1 from ${reposts} where ${reposts.postId} = ${posts.id} and ${reposts.actorId} = ${viewerId})`
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
    repostsCount: row.repostsCount,
    repostedByViewer: row.repostedByViewer,
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

/**
 * Renders post Markdown. Only @mentions of local accounts that exist become links, so the
 * accounts are looked up first.
 */
async function renderPost(db: Executor, content: string) {
  const candidates = findMentions(content);
  const accounts =
    candidates.length > 0
      ? await db
          .select({ id: actors.id, username: actors.username })
          .from(actors)
          .where(and(isNull(actors.domain), inArray(sql`lower(${actors.username})`, candidates)))
      : [];
  const byUsername = new Map(accounts.map((account) => [account.username.toLowerCase(), account]));

  const rendered = renderMarkdown(content, {
    mentions: new Map(
      accounts.map((account) => [account.username.toLowerCase(), account.username]),
    ),
  });
  return {
    html: rendered.html,
    tags: rendered.tags,
    mentionedIds: rendered.mentions.flatMap(
      (username) => byUsername.get(username.toLowerCase())?.id ?? [],
    ),
  };
}

/**
 * Replaces the post's mentions. People newly mentioned are notified and people no longer
 * mentioned lose the notification, so editing a post never notifies anyone twice.
 * `skipRecipientId` is someone already notified another way (the author of the post
 * a reply answers).
 */
async function saveMentions(
  tx: Executor,
  post: { id: string; authorId: string },
  mentionedIds: string[],
  skipRecipientId: string | null,
) {
  const previous = await tx
    .select({ actorId: postMentions.actorId })
    .from(postMentions)
    .where(eq(postMentions.postId, post.id));
  const before = new Set(previous.map((row) => row.actorId));
  const after = new Set(mentionedIds);

  await tx.delete(postMentions).where(eq(postMentions.postId, post.id));
  if (after.size > 0) {
    await tx
      .insert(postMentions)
      .values([...after].map((actorId) => ({ postId: post.id, actorId })));
  }

  const event = (recipientId: string) =>
    ({ recipientId, actorId: post.authorId, type: 'mention', postId: post.id }) as const;
  for (const actorId of before) {
    if (!after.has(actorId)) await retract(tx, event(actorId));
  }
  for (const actorId of after) {
    if (!before.has(actorId) && actorId !== skipRecipientId) await notify(tx, event(actorId));
  }
}

/** HTML for the composer's preview, rendered exactly like a published post. */
export async function previewPost(db: Database, content: string): Promise<string> {
  return (await renderPost(db, content)).html;
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
  const rendered = await renderPost(db, input.content);
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
    await saveMentions(
      tx,
      { id: post.id, authorId },
      rendered.mentionedIds,
      parent?.authorId ?? null,
    );
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
  const rendered = await renderPost(db, input.content);
  return db.transaction(async (tx) => {
    const access = await checkOwner(tx, postId, authorId);
    if (access !== 'ok') return access;

    // The author of the post a reply answers already got a reply notification.
    const parents = alias(posts, 'parents');
    const [parent] = await tx
      .select({ authorId: parents.authorId })
      .from(posts)
      .innerJoin(parents, eq(parents.id, posts.replyToId))
      .where(eq(posts.id, postId));

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
    await saveMentions(
      tx,
      { id: postId, authorId },
      rendered.mentionedIds,
      parent?.authorId ?? null,
    );
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

/** Reposts that belong in the list, or null for lists without reposts. */
function repostCondition(filter: PostFilter): SQL | undefined | null {
  switch (filter.kind) {
    case 'author':
      return eq(
        reposts.actorId,
        sql`(select ${actors.id} from ${actors} where ${isLocalUsername(filter.username)})`,
      );
    case 'feed':
      return or(
        eq(reposts.actorId, filter.actorId),
        inArray(
          reposts.actorId,
          sql`(select ${follows.followeeId} from ${follows} where ${follows.followerId} = ${filter.actorId})`,
        ),
      );
    case 'tag':
      return null;
  }
}

/**
 * Newest entries matching the filter, one page at a time. Profiles and the feed mix in
 * reposts at the time they were made: posts and reposts both have time-ordered ids, so
 * one ordering by id covers both.
 */
export async function listPosts(
  db: Database,
  filter: PostFilter,
  {
    before,
    viewerId = null,
    limit = PAGE_SIZE,
  }: { before?: string | undefined; viewerId?: string | null; limit?: number } = {},
): Promise<PostPage> {
  const postEntries = sql`select ${posts.id} as entry_id, ${posts.id} as post_id, null::uuid as reposter_id
    from ${posts} inner join ${actors} on ${actors.id} = ${posts.authorId}
    where ${and(filterCondition(filter), before ? lt(posts.id, before) : undefined)}`;
  const reposted = repostCondition(filter);
  const repostEntries =
    reposted === null
      ? sql``
      : sql`union all select ${reposts.id}, ${reposts.postId}, ${reposts.actorId} from ${reposts}
          where ${and(reposted, before ? lt(reposts.id, before) : undefined)}`;

  const entries = await db.execute<{
    entry_id: string;
    post_id: string;
    reposter_id: string | null;
  }>(
    sql`select * from (${postEntries} ${repostEntries}) as entries
      order by entry_id desc limit ${limit + 1}`,
  );
  const page = entries.slice(0, limit);
  return {
    items: await toEntries(db, page, viewerId),
    nextCursor: entries.length > limit ? (page.at(-1)?.entry_id ?? null) : null,
  };
}

/** Loads the posts and reposters behind a page of entries, keeping the entries' order. */
export async function toEntries(
  db: Database,
  entries: { entry_id: string; post_id: string; reposter_id: string | null }[],
  viewerId: string | null,
): Promise<TimelineEntry[]> {
  if (entries.length === 0) return [];

  const postIds = [...new Set(entries.map((entry) => entry.post_id))];
  const reposterIds = [...new Set(entries.flatMap((entry) => entry.reposter_id ?? []))];
  const [rows, reposters] = await Promise.all([
    selectPosts(db, viewerId).where(inArray(posts.id, postIds)),
    reposterIds.length > 0
      ? db
          .select({ id: actors.id, username: actors.username, displayName: actors.displayName })
          .from(actors)
          .where(inArray(actors.id, reposterIds))
      : Promise.resolve([]),
  ]);
  const postById = new Map(rows.map((row) => [row.id, toView(row)]));
  const reposterById = new Map(reposters.map(({ id, ...reposter }) => [id, reposter]));

  // A post deleted between the two queries is simply skipped.
  return entries.flatMap((entry) => {
    const post = postById.get(entry.post_id);
    if (!post) return [];
    const repostedBy = entry.reposter_id ? (reposterById.get(entry.reposter_id) ?? null) : null;
    return [{ ...post, entryId: entry.entry_id, repostedBy }];
  });
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
    items: page.map((row) => ({ ...toView(row), entryId: row.id, repostedBy: null })),
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
