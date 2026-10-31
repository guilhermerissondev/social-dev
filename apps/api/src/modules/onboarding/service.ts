import { schema, type Database } from '@social-dev/db';
import { and, desc, eq, isNull, notExists, sql } from '@social-dev/db/orm';

import type { ProfileSummary } from '../social-graph/service.ts';

const { actors, actorTechnologies, follows, postTags, posts, tagFollows, tags, users } = schema;

/** Marks onboarding as done (finished or skipped). Doing it again changes nothing. */
export async function completeOnboarding(db: Database, userId: string): Promise<void> {
  await db
    .update(users)
    .set({ onboardingCompletedAt: new Date() })
    .where(and(eq(users.id, userId), isNull(users.onboardingCompletedAt)));
}

export interface PersonSuggestion extends ProfileSummary {
  /** Technologies both people list on their profiles (up to three). */
  sharedTechnologies: string[];
  /** How many of the people the viewer follows already follow this person. */
  followedByFollowing: number;
}

/**
 * People the actor may want to follow. Shared stack weighs most, then being followed by
 * people the actor follows, then the same area, then overall popularity. People already
 * followed are left out. A brand-new account with no stack still gets the most followed.
 */
export async function suggestPeople(
  db: Database,
  actorId: string,
  limit: number,
): Promise<PersonSuggestion[]> {
  const sharedTechnologies = sql<string[]>`array(
    select ${tags.name} from ${actorTechnologies} as theirs
    inner join ${actorTechnologies} as mine on mine.tag_id = theirs.tag_id and mine.actor_id = ${actorId}
    inner join ${tags} on ${tags.id} = theirs.tag_id
    where theirs.actor_id = ${actors.id}
    order by theirs.position limit 3)`;
  const sharedCount = sql<number>`(select count(*) from ${actorTechnologies} as theirs
    inner join ${actorTechnologies} as mine on mine.tag_id = theirs.tag_id and mine.actor_id = ${actorId}
    where theirs.actor_id = ${actors.id})::int`;
  const followedByFollowing = sql<number>`(select count(*) from ${follows} as theirs
    where theirs.followee_id = ${actors.id}
      and theirs.follower_id in (select followee_id from ${follows} where follower_id = ${actorId}))::int`;
  const sameArea = sql<number>`(case when ${actors.area} is not null and ${actors.area} =
    (select area from ${actors} as me where me.id = ${actorId}) then 1 else 0 end)`;
  const followersCount = sql<number>`(select count(*) from ${follows} where ${follows.followeeId} = ${actors.id})`;

  const rows = await db
    .select({
      id: actors.id,
      username: actors.username,
      displayName: actors.displayName,
      bio: actors.bio,
      avatarUrl: users.image,
      sharedTechnologies,
      followedByFollowing,
    })
    .from(actors)
    .leftJoin(users, eq(users.id, actors.userId))
    .where(
      and(
        isNull(actors.domain),
        sql`${actors.id} <> ${actorId}`,
        notExists(
          sql`(select 1 from ${follows} where ${follows.followerId} = ${actorId} and ${follows.followeeId} = ${actors.id})`,
        ),
      ),
    )
    .orderBy(
      desc(
        sql`${sharedCount} * 3 + ${followedByFollowing} * 2 + ${sameArea} + ln(1 + ${followersCount})`,
      ),
      desc(actors.createdAt),
    )
    .limit(limit);

  return rows;
}

/**
 * Tags the actor may want to follow: their own stack first, then tags used in recent
 * posts. Tags already followed are left out.
 */
export async function suggestTags(db: Database, actorId: string, limit: number): Promise<string[]> {
  const notFollowed = notExists(
    sql`(select 1 from ${tagFollows} where ${tagFollows.actorId} = ${actorId} and ${tagFollows.tagId} = ${tags.id})`,
  );

  const stack = await db
    .select({ name: tags.name })
    .from(actorTechnologies)
    .innerJoin(tags, eq(tags.id, actorTechnologies.tagId))
    .where(and(eq(actorTechnologies.actorId, actorId), notFollowed))
    .orderBy(actorTechnologies.position);

  const recentlyUsed = sql<number>`count(*)`;
  const popular = await db
    .select({ name: tags.name })
    .from(postTags)
    .innerJoin(tags, eq(tags.id, postTags.tagId))
    .innerJoin(posts, eq(posts.id, postTags.postId))
    .where(and(sql`${posts.createdAt} > now() - interval '30 days'`, notFollowed))
    .groupBy(tags.name)
    .orderBy(desc(recentlyUsed), tags.name)
    .limit(limit);

  return [...new Set([...stack, ...popular].map((tag) => tag.name))].slice(0, limit);
}
