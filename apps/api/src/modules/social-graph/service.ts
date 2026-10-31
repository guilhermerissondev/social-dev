import { schema, type Database } from '@social-dev/db';
import { and, count, desc, eq, lt, or, sql } from '@social-dev/db/orm';

import { decodeCursor, encodeCursor } from '../../lib/cursor.ts';
import { notify, retract } from '../notifications/service.ts';
import { findLocalActorId } from '../profiles/service.ts';
import { upsertTags } from '../tags/service.ts';

const { actors, follows, tagFollows, tags, users } = schema;

export const FOLLOW_PAGE_SIZE = 30;

export type FollowResult = 'ok' | 'not_found' | 'self';

/** Follows a local account. Following twice is not an error. */
export async function followActor(
  db: Database,
  followerId: string,
  username: string,
): Promise<FollowResult> {
  const followeeId = await findLocalActorId(db, username);
  if (!followeeId) return 'not_found';
  if (followeeId === followerId) return 'self';

  await db.transaction(async (tx) => {
    await tx.insert(follows).values({ followerId, followeeId }).onConflictDoNothing();
    await notify(tx, { recipientId: followeeId, actorId: followerId, type: 'follow' });
  });
  return 'ok';
}

export async function unfollowActor(
  db: Database,
  followerId: string,
  username: string,
): Promise<Exclude<FollowResult, 'self'>> {
  const followeeId = await findLocalActorId(db, username);
  if (!followeeId) return 'not_found';

  await db.transaction(async (tx) => {
    await tx
      .delete(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followeeId, followeeId)));
    await retract(tx, { recipientId: followeeId, actorId: followerId, type: 'follow' });
  });
  return 'ok';
}

/** Follows a tag, creating it if nobody has used it yet. `name` must be normalized. */
export async function followTag(db: Database, actorId: string, name: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [tagId] = await upsertTags(tx, [name]);
    if (!tagId) throw new Error(`tag ${name} was not created`);
    await tx.insert(tagFollows).values({ actorId, tagId }).onConflictDoNothing();
  });
}

export async function unfollowTag(db: Database, actorId: string, name: string): Promise<void> {
  await db
    .delete(tagFollows)
    .where(
      and(
        eq(tagFollows.actorId, actorId),
        eq(tagFollows.tagId, sql`(select ${tags.id} from ${tags} where ${tags.name} = ${name})`),
      ),
    );
}

export interface FollowStats {
  followersCount: number;
  followingCount: number;
  /** Whether the signed-in visitor follows this account. False for visitors. */
  followedByViewer: boolean;
}

export async function getFollowStats(
  db: Database,
  actorId: string,
  viewerId: string | null,
): Promise<FollowStats> {
  const [[followers], [following], viewer] = await Promise.all([
    db.select({ value: count() }).from(follows).where(eq(follows.followeeId, actorId)),
    db.select({ value: count() }).from(follows).where(eq(follows.followerId, actorId)),
    viewerId
      ? db
          .select({ one: sql`1` })
          .from(follows)
          .where(and(eq(follows.followerId, viewerId), eq(follows.followeeId, actorId)))
      : Promise.resolve([]),
  ]);

  return {
    followersCount: followers?.value ?? 0,
    followingCount: following?.value ?? 0,
    followedByViewer: viewer.length > 0,
  };
}

export interface TagInfo {
  name: string;
  followersCount: number;
  followedByViewer: boolean;
}

/** Tag details. Tags nobody has used yet exist implicitly, with no followers. */
export async function getTagInfo(
  db: Database,
  name: string,
  viewerId: string | null,
): Promise<TagInfo> {
  const [row] = await db
    .select({
      followersCount: count(tagFollows.actorId),
      followedByViewer: viewerId
        ? sql<boolean>`coalesce(bool_or(${tagFollows.actorId} = ${viewerId}), false)`
        : sql<boolean>`false`,
    })
    .from(tags)
    .leftJoin(tagFollows, eq(tagFollows.tagId, tags.id))
    .where(eq(tags.name, name));

  return {
    name,
    followersCount: row?.followersCount ?? 0,
    followedByViewer: row?.followedByViewer ?? false,
  };
}

export interface ProfileSummary {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
}

export interface ProfilePage {
  items: ProfileSummary[];
  nextCursor: string | null;
}

/**
 * Followers (`direction: 'followers'`) or followed accounts (`'following'`) of an actor,
 * most recent follow first.
 */
export async function listFollows(
  db: Database,
  actorId: string,
  direction: 'followers' | 'following',
  cursorValue?: string,
): Promise<ProfilePage> {
  // "followers": rows where the actor is followed, listing the follower; and vice versa.
  const [self, other] =
    direction === 'followers'
      ? [follows.followeeId, follows.followerId]
      : [follows.followerId, follows.followeeId];
  const cursor = cursorValue ? decodeCursor(cursorValue) : null;

  const rows = await db
    .select({
      id: actors.id,
      username: actors.username,
      displayName: actors.displayName,
      bio: actors.bio,
      avatarUrl: users.image,
      followedAt: follows.createdAt,
    })
    .from(follows)
    .innerJoin(actors, eq(actors.id, other))
    .leftJoin(users, eq(users.id, actors.userId))
    .where(
      and(
        eq(self, actorId),
        cursor
          ? or(
              lt(follows.createdAt, new Date(cursor.at)),
              and(eq(follows.createdAt, new Date(cursor.at)), lt(other, cursor.id)),
            )
          : undefined,
      ),
    )
    .orderBy(desc(follows.createdAt), desc(other))
    .limit(FOLLOW_PAGE_SIZE + 1);

  const page = rows.slice(0, FOLLOW_PAGE_SIZE);
  const last = page.at(-1);
  return {
    items: page.map((row) => ({
      id: row.id,
      username: row.username,
      displayName: row.displayName,
      bio: row.bio,
      avatarUrl: row.avatarUrl,
    })),
    nextCursor:
      rows.length > FOLLOW_PAGE_SIZE && last
        ? encodeCursor({ at: last.followedAt.toISOString(), id: last.id })
        : null,
  };
}
