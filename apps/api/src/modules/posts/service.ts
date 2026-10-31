import { schema, type Database, type Executor } from '@social-dev/db';
import { and, desc, eq, exists, lt, sql, type SQL } from '@social-dev/db/orm';
import { renderMarkdown } from '@social-dev/markdown';
import { POST_LIMITS, type PostInput } from '@social-dev/shared';

import { isLocalUsername } from '../profiles/service.ts';
import { upsertTags } from '../tags/service.ts';

const { actors, posts, postTags, tags, users } = schema;

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
}

export interface PostPage {
  items: PostView[];
  /** Pass as `before` to get the next (older) page. Null on the last page. */
  nextCursor: string | null;
}

export type PostFilter = { kind: 'author'; username: string } | { kind: 'tag'; name: string };

const postColumns = {
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
};

function selectPosts(db: Executor) {
  return db
    .select(postColumns)
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

export async function createPost(db: Database, authorId: string, input: PostInput) {
  const rendered = renderMarkdown(input.content);
  return db.transaction(async (tx) => {
    const [post] = await tx
      .insert(posts)
      .values({
        authorId,
        title: titleOf(input),
        content: input.content,
        contentHtml: rendered.html,
      })
      .returning({ id: posts.id });
    if (!post) throw new Error('post was not created');

    await saveTags(tx, post.id, rendered.tags);
    return post.id;
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
        title: titleOf(input),
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

export async function getPost(db: Database, postId: string): Promise<PostView | null> {
  const [row] = await selectPosts(db).where(eq(posts.id, postId));
  return row ? toView(row) : null;
}

function filterCondition(filter: PostFilter): SQL | undefined {
  switch (filter.kind) {
    case 'author':
      return isLocalUsername(filter.username);
    case 'tag':
      return exists(
        sql`(select 1 from ${postTags} inner join ${tags} on ${tags.id} = ${postTags.tagId}
          where ${postTags.postId} = ${posts.id} and ${tags.name} = ${filter.name})`,
      );
  }
}

/** Newest posts matching the filter, one page at a time. */
export async function listPosts(
  db: Database,
  filter: PostFilter,
  { before, limit = PAGE_SIZE }: { before?: string | undefined; limit?: number } = {},
): Promise<PostPage> {
  const rows = await selectPosts(db)
    .where(and(filterCondition(filter), before ? lt(posts.id, before) : undefined))
    .orderBy(desc(posts.id))
    .limit(limit + 1);

  const items = rows.slice(0, limit).map(toView);
  return { items, nextCursor: rows.length > limit ? (items.at(-1)?.id ?? null) : null };
}
