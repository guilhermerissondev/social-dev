import { schema, type Database, type Executor } from '@social-dev/db';
import { and, asc, eq, isNull, sql, type SQL } from '@social-dev/db/orm';
import { normalizeTag, PROFILE_LIMITS, type UpdateProfileInput } from '@social-dev/shared';

import { upsertTags } from '../tags/service.ts';

const { actors, actorTechnologies, tags, users } = schema;

/** Matches the local actor with this handle, ignoring case. */
export function isLocalUsername(username: string): SQL | undefined {
  return and(isNull(actors.domain), eq(sql`lower(${actors.username})`, username.toLowerCase()));
}

/** Id of the local actor with this handle, or null. */
export async function findLocalActorId(db: Executor, username: string): Promise<string | null> {
  const [row] = await db.select({ id: actors.id }).from(actors).where(isLocalUsername(username));
  return row?.id ?? null;
}

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  location: string;
  links: { label: string; url: string }[];
  technologies: string[];
  avatarUrl: string | null;
  createdAt: string;
}

interface LocalUser {
  id: string;
  name: string;
  username?: string | null | undefined;
  displayUsername?: string | null | undefined;
}

/**
 * Creates the local actor for a user that already has a username. Does nothing when the
 * user has no username yet or already has an actor.
 */
export async function ensureLocalActor(db: Executor, user: LocalUser): Promise<void> {
  const username = user.displayUsername ?? user.username;
  if (!username) return;

  await db
    .insert(actors)
    .values({
      userId: user.id,
      username,
      displayName: user.name.trim().slice(0, PROFILE_LIMITS.displayName) || username,
    })
    .onConflictDoNothing();
}

export type ClaimUsernameResult = 'ok' | 'taken' | 'already_set';

/** Gives a username to an account created without one (GitHub/GitLab sign-up). */
export async function claimUsername(
  db: Database,
  userId: string,
  username: string,
): Promise<ClaimUsernameResult> {
  return db.transaction(async (tx) => {
    const [user] = await tx
      .select({ name: users.name, username: users.username })
      .from(users)
      .where(eq(users.id, userId))
      .for('update');
    if (!user) throw new Error(`user ${userId} not found`);
    if (user.username) return 'already_set';

    const [taken] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username.toLowerCase()));
    if (taken) return 'taken';

    await tx
      .update(users)
      .set({ username: username.toLowerCase(), displayUsername: username })
      .where(eq(users.id, userId));
    await ensureLocalActor(tx, { id: userId, name: user.name, username });
    return 'ok';
  });
}

/** Public profile of a local account, looked up by handle (case-insensitive). */
export async function getLocalProfile(db: Database, username: string): Promise<Profile | null> {
  const [row] = await db
    .select({
      id: actors.id,
      username: actors.username,
      displayName: actors.displayName,
      bio: actors.bio,
      location: actors.location,
      links: actors.links,
      avatarUrl: users.image,
      createdAt: actors.createdAt,
    })
    .from(actors)
    .innerJoin(users, eq(users.id, actors.userId))
    .where(isLocalUsername(username));
  if (!row) return null;

  const technologies = await db
    .select({ name: tags.name })
    .from(actorTechnologies)
    .innerJoin(tags, eq(tags.id, actorTechnologies.tagId))
    .where(eq(actorTechnologies.actorId, row.id))
    .orderBy(asc(actorTechnologies.position));

  return {
    ...row,
    technologies: technologies.map((tag) => tag.name),
    createdAt: row.createdAt.toISOString(),
  };
}

/** Returns the id of the user's local actor, or null when the user has no username yet. */
export async function findActorIdByUser(db: Database, userId: string): Promise<string | null> {
  const [row] = await db.select({ id: actors.id }).from(actors).where(eq(actors.userId, userId));
  return row?.id ?? null;
}

/** Replaces the editable profile fields. The account name follows the display name. */
export async function updateProfile(
  db: Database,
  userId: string,
  input: UpdateProfileInput,
): Promise<void> {
  // Different spellings of the same tag ("Rust", "#rust") collapse into one entry.
  const technologies = [
    ...new Set(input.technologies.flatMap((value) => normalizeTag(value) ?? [])),
  ];

  await db.transaction(async (tx) => {
    const [actor] = await tx
      .update(actors)
      .set({
        displayName: input.displayName,
        bio: input.bio,
        location: input.location,
        links: input.links,
      })
      .where(eq(actors.userId, userId))
      .returning({ id: actors.id });
    if (!actor) throw new Error(`user ${userId} has no actor`);

    await tx.update(users).set({ name: input.displayName }).where(eq(users.id, userId));

    await tx.delete(actorTechnologies).where(eq(actorTechnologies.actorId, actor.id));
    const tagIds = await upsertTags(tx, technologies);
    if (tagIds.length === 0) return;
    await tx
      .insert(actorTechnologies)
      .values(tagIds.map((tagId, position) => ({ actorId: actor.id, tagId, position })));
  });
}
