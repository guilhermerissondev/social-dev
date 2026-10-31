import { schema, type Database } from '@social-dev/db';
import { and, count, desc, eq, exists, gte, isNull, sql } from '@social-dev/db/orm';

import { toEntries, type PostPage } from '../posts/service.ts';

const { likes, posts, postTags, reposts, tags } = schema;

export const EXPLORE_PAGE_SIZE = 20;
/** Explore is a showcase, not an archive: it stops after this many pages. */
export const EXPLORE_MAX_PAGES = 10;
export const TRENDING_TAGS_LIMIT = 10;

export const explorePeriods = ['day', 'week', 'month'] as const;
export type ExplorePeriod = (typeof explorePeriods)[number];

const periodDays: Record<ExplorePeriod, number> = { day: 1, week: 7, month: 30 };

function since(period: ExplorePeriod, now = new Date()): Date {
  return new Date(now.getTime() - periodDays[period] * 24 * 60 * 60 * 1000);
}

/**
 * How much a post caught on: likes, plus replies in its conversation, plus reposts counted
 * double because they bring the post to new people. Computed on read for now; a stored
 * score can come when the volume asks for it (docs/plano-inicial.md, section 6.3).
 */
const score = sql<number>`(
  (select count(*) from ${likes} where ${likes.postId} = ${posts.id})
  + (select count(*) from ${posts} as replies where replies.thread_id = ${posts.id})
  + 2 * (select count(*) from ${reposts} where ${reposts.postId} = ${posts.id})
)`;

function hasTag(name: string) {
  return exists(
    sql`(select 1 from ${postTags} inner join ${tags} on ${tags.id} = ${postTags.tagId}
      where ${postTags.postId} = ${posts.id} and ${tags.name} = ${name})`,
  );
}

/**
 * Conversation starts from the period, most engaging first and newest among ties, so a
 * young network still has something to show. Paged by offset because the order is a
 * ranking, not a timeline; the cursor is the offset of the next page.
 */
export async function listPopularPosts(
  db: Database,
  {
    period,
    tag,
    cursor,
    viewerId,
  }: {
    period: ExplorePeriod;
    tag?: string | undefined;
    cursor?: string | undefined;
    viewerId: string | null;
  },
): Promise<PostPage> {
  const offset = Math.max(0, Number.parseInt(cursor ?? '0', 10) || 0);
  if (offset >= EXPLORE_PAGE_SIZE * EXPLORE_MAX_PAGES) return { items: [], nextCursor: null };

  const rows = await db
    .select({ id: posts.id })
    .from(posts)
    .where(
      and(
        isNull(posts.threadId),
        gte(posts.createdAt, since(period)),
        tag ? hasTag(tag) : undefined,
      ),
    )
    .orderBy(desc(score), desc(posts.id))
    .offset(offset)
    .limit(EXPLORE_PAGE_SIZE + 1);

  const page = rows.slice(0, EXPLORE_PAGE_SIZE);
  const nextOffset = offset + EXPLORE_PAGE_SIZE;
  return {
    items: await toEntries(
      db,
      page.map((row) => ({ entry_id: row.id, post_id: row.id, reposter_id: null })),
      viewerId,
    ),
    nextCursor:
      rows.length > EXPLORE_PAGE_SIZE && nextOffset < EXPLORE_PAGE_SIZE * EXPLORE_MAX_PAGES
        ? String(nextOffset)
        : null,
  };
}

export interface TrendingTag {
  name: string;
  postsCount: number;
}

/** Tags used in the most conversation starts of the period. */
export async function listTrendingTags(
  db: Database,
  period: ExplorePeriod,
): Promise<TrendingTag[]> {
  const postsCount = count(postTags.postId);
  return db
    .select({ name: tags.name, postsCount })
    .from(postTags)
    .innerJoin(posts, eq(posts.id, postTags.postId))
    .innerJoin(tags, eq(tags.id, postTags.tagId))
    .where(and(isNull(posts.threadId), gte(posts.createdAt, since(period))))
    .groupBy(tags.name)
    .orderBy(desc(postsCount), tags.name)
    .limit(TRENDING_TAGS_LIMIT);
}
