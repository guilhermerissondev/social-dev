import { schema, type Database, type PinnedRepo } from '@social-dev/db';
import { and, eq, inArray, isNull, sql } from '@social-dev/db/orm';

import type { Auth } from '../../auth/auth.ts';
import type { GitHubClient } from '../../github/client.ts';
import type { Logger } from '../../logger.ts';
import type { ProfileSummary } from '../social-graph/service.ts';

const { accounts, actors, follows, githubProfiles, users } = schema;

/** Data older than this is refreshed when the person opens their GitHub settings. */
export const AUTO_REFRESH_AFTER_MS = 60 * 60 * 1000;
/** Pressing "refresh" does nothing more often than this. */
export const MANUAL_REFRESH_AFTER_MS = 5 * 60 * 1000;

export interface GitHubDeps {
  db: Database;
  auth: Auth;
  github: GitHubClient;
  logger: Logger;
}

interface Viewer {
  userId: string;
  actorId: string;
}

/** The person's GitHub login account and a usable access token, or null if not connected. */
async function gitHubAccess({ db, auth, logger }: GitHubDeps, userId: string) {
  const [account] = await db
    .select({ id: accounts.id, githubId: accounts.accountId })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.providerId, 'github')));
  if (!account) return null;

  try {
    // Better Auth decrypts the stored token (and refreshes it when it can).
    const { accessToken } = await auth.api.getAccessToken({
      body: { accountId: account.id, userId },
    });
    return accessToken ? { githubId: account.githubId, token: accessToken } : null;
  } catch (error) {
    logger.warn({ err: error, userId }, 'could not get a GitHub access token');
    return null;
  }
}

export interface GitHubStatus {
  connected: boolean;
  login: string | null;
  showOnProfile: boolean;
  pinnedRepos: PinnedRepo[];
  fetchedAt: string | null;
}

async function readProfile(db: Database, actorId: string) {
  const [row] = await db.select().from(githubProfiles).where(eq(githubProfiles.actorId, actorId));
  return row ?? null;
}

/**
 * The person's GitHub connection, refreshing the stored data from GitHub when it is older
 * than `refreshAfterMs`. GitHub failures keep the stored data instead of failing.
 */
export async function syncGitHub(
  deps: GitHubDeps,
  viewer: Viewer,
  refreshAfterMs = AUTO_REFRESH_AFTER_MS,
): Promise<GitHubStatus> {
  const access = await gitHubAccess(deps, viewer.userId);
  let profile = await readProfile(deps.db, viewer.actorId);

  const stale = !profile || Date.now() - profile.fetchedAt.getTime() > refreshAfterMs;
  if (access && stale) {
    try {
      const { login, pinnedRepos } = await deps.github.viewer(access.token);
      const values = { login, pinnedRepos, fetchedAt: new Date() };
      const [saved] = await deps.db
        .insert(githubProfiles)
        .values({ actorId: viewer.actorId, ...values })
        .onConflictDoUpdate({ target: githubProfiles.actorId, set: values })
        .returning();
      profile = saved ?? profile;
    } catch (error) {
      deps.logger.warn({ err: error, userId: viewer.userId }, 'could not refresh GitHub data');
    }
  }

  return {
    connected: access !== null,
    login: profile?.login ?? null,
    showOnProfile: profile?.showOnProfile ?? true,
    pinnedRepos: profile?.pinnedRepos ?? [],
    fetchedAt: profile?.fetchedAt.toISOString() ?? null,
  };
}

export async function setShowOnProfile(db: Database, actorId: string, show: boolean) {
  await db
    .update(githubProfiles)
    .set({ showOnProfile: show })
    .where(eq(githubProfiles.actorId, actorId));
}

/** What a profile shows about GitHub: nothing unless the owner allows it. */
export async function publicGitHub(
  db: Database,
  actorId: string,
): Promise<{ login: string; pinnedRepos: PinnedRepo[] } | null> {
  const profile = await readProfile(db, actorId);
  if (!profile?.showOnProfile) return null;
  return { login: profile.login, pinnedRepos: profile.pinnedRepos };
}

export interface GitHubFollow extends ProfileSummary {
  followedByViewer: boolean;
}

/**
 * People on Social Dev whom the viewer follows on GitHub (matched by their linked GitHub
 * account), or null when the viewer has no GitHub connection.
 */
export async function gitHubFollowsOnSocialDev(
  deps: GitHubDeps,
  viewer: Viewer,
): Promise<GitHubFollow[] | null> {
  const access = await gitHubAccess(deps, viewer.userId);
  if (!access) return null;

  const ids = await deps.github.followingIds(access.token);
  if (ids.length === 0) return [];

  return deps.db
    .select({
      id: actors.id,
      username: actors.username,
      displayName: actors.displayName,
      bio: actors.bio,
      avatarUrl: users.image,
      followedByViewer: sql<boolean>`exists(select 1 from ${follows}
        where ${follows.followerId} = ${viewer.actorId} and ${follows.followeeId} = ${actors.id})`,
    })
    .from(accounts)
    .innerJoin(users, eq(users.id, accounts.userId))
    .innerJoin(actors, eq(actors.userId, users.id))
    .where(
      and(
        eq(accounts.providerId, 'github'),
        inArray(accounts.accountId, ids),
        isNull(actors.domain),
        sql`${actors.id} <> ${viewer.actorId}`,
      ),
    )
    .orderBy(actors.username);
}
