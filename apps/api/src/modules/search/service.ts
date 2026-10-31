import { schema, type Database } from '@social-dev/db';
import { and, count, desc, eq, isNull, like, or, sql } from '@social-dev/db/orm';
import { normalizeTag } from '@social-dev/shared';

import { toEntries, type PostPage } from '../posts/service.ts';
import type { ProfileSummary } from '../social-graph/service.ts';

const { actors, posts, postTags, tags, users } = schema;

export const SEARCH_PAGE_SIZE = 20;
const MAX_POST_PAGES = 10;

/** Escapes LIKE wildcards so "a_b" or "100%" match literally. */
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * Local accounts whose username or name contains the query. An exact username comes
 * first, then usernames starting with it, then the closest matches (trigram similarity).
 */
export async function searchPeople(
  db: Database,
  query: string,
  limit: number,
): Promise<ProfileSummary[]> {
  const term = query.trim().replace(/^@/, '').toLowerCase();
  if (!term) return [];
  const contains = `%${escapeLike(term)}%`;
  const username = sql`lower(${actors.username})`;
  const displayName = sql`lower(${actors.displayName})`;

  return db
    .select({
      id: actors.id,
      username: actors.username,
      displayName: actors.displayName,
      bio: actors.bio,
      avatarUrl: users.image,
    })
    .from(actors)
    .leftJoin(users, eq(users.id, actors.userId))
    .where(and(isNull(actors.domain), or(like(username, contains), like(displayName, contains))))
    .orderBy(
      desc(sql`${username} = ${term}`),
      desc(sql`${username} like ${`${escapeLike(term)}%`}`),
      desc(sql`greatest(similarity(${username}, ${term}), similarity(${displayName}, ${term}))`),
      actors.username,
    )
    .limit(limit);
}

/** Tags starting with the query, most used first. */
export async function searchTags(
  db: Database,
  query: string,
  limit: number,
): Promise<{ name: string; postsCount: number }[]> {
  const term = normalizeTag(query);
  if (!term) return [];
  const postsCount = count(postTags.postId);

  return db
    .select({ name: tags.name, postsCount })
    .from(tags)
    .leftJoin(postTags, eq(postTags.tagId, tags.id))
    .where(like(tags.name, `${escapeLike(term)}%`))
    .groupBy(tags.name)
    .orderBy(desc(postsCount), tags.name)
    .limit(limit);
}

/**
 * Posts and replies matching the query, best match first. Accepts web search syntax:
 * "exact phrase", -excluded, or. Paged by offset because the order is a ranking.
 */
export async function searchPosts(
  db: Database,
  query: string,
  { cursor, viewerId }: { cursor?: string | undefined; viewerId: string | null },
): Promise<PostPage> {
  const offset = Math.max(0, Number.parseInt(cursor ?? '0', 10) || 0);
  if (!query.trim() || offset >= SEARCH_PAGE_SIZE * MAX_POST_PAGES) {
    return { items: [], nextCursor: null };
  }
  const tsquery = sql`websearch_to_tsquery('social_dev', ${query})`;

  const rows = await db
    .select({ id: posts.id })
    .from(posts)
    .where(sql`${posts.search} @@ ${tsquery}`)
    .orderBy(desc(sql`ts_rank_cd(${posts.search}, ${tsquery})`), desc(posts.id))
    .offset(offset)
    .limit(SEARCH_PAGE_SIZE + 1);

  const page = rows.slice(0, SEARCH_PAGE_SIZE);
  const nextOffset = offset + SEARCH_PAGE_SIZE;
  return {
    items: await toEntries(
      db,
      page.map((row) => ({ entry_id: row.id, post_id: row.id, reposter_id: null })),
      viewerId,
    ),
    nextCursor:
      rows.length > SEARCH_PAGE_SIZE && nextOffset < SEARCH_PAGE_SIZE * MAX_POST_PAGES
        ? String(nextOffset)
        : null,
  };
}
