import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Context } from 'hono';

import type { AppEnv } from '../../app.ts';
import { requireActorId } from '../../auth/actor.ts';
import { currentUser, requireSession } from '../../auth/session.ts';
import { AppError } from '../../errors.ts';
import { GitHubError } from '../../github/client.ts';
import { followActor } from '../social-graph/service.ts';
import {
  gitHubFollowsOnSocialDev,
  MANUAL_REFRESH_AFTER_MS,
  setShowOnProfile,
  syncGitHub,
} from './service.ts';

const json = <T extends z.ZodType>(body: T) => ({ 'application/json': { schema: body } });

export const PinnedRepoSchema = z
  .object({
    name: z.string(),
    nameWithOwner: z.string(),
    description: z.string().nullable(),
    url: z.url(),
    stars: z.number().int(),
    language: z.object({ name: z.string(), color: z.string().nullable() }).nullable(),
  })
  .openapi('PinnedRepo');

const StatusSchema = z
  .object({
    connected: z.boolean().openapi({ description: 'Whether the account is linked to GitHub' }),
    login: z.string().nullable(),
    showOnProfile: z.boolean(),
    pinnedRepos: z.array(PinnedRepoSchema),
    fetchedAt: z.iso.datetime().nullable(),
  })
  .openapi('GitHubStatus');

const signedIn = {
  401: { description: 'Not signed in' },
  409: { description: 'The signed-in account has no username yet' },
} as const;

const routes = {
  status: createRoute({
    method: 'get',
    path: '/api/me/github',
    tags: ['GitHub'],
    summary: 'Your GitHub connection, refreshed from GitHub when older than an hour',
    middleware: [requireSession] as const,
    responses: { 200: { description: 'Status', content: json(StatusSchema) }, ...signedIn },
  }),
  refresh: createRoute({
    method: 'post',
    path: '/api/me/github/refresh',
    tags: ['GitHub'],
    summary: 'Read your login and pinned repositories from GitHub again (every 5 minutes at most)',
    middleware: [requireSession] as const,
    responses: { 200: { description: 'Status', content: json(StatusSchema) }, ...signedIn },
  }),
  settings: createRoute({
    method: 'put',
    path: '/api/me/github/settings',
    tags: ['GitHub'],
    summary: 'Choose whether your profile shows your GitHub login and pinned repositories',
    middleware: [requireSession] as const,
    request: {
      body: { required: true, content: json(z.object({ showOnProfile: z.boolean() })) },
    },
    responses: { 204: { description: 'Saved' }, ...signedIn },
  }),
  following: createRoute({
    method: 'get',
    path: '/api/me/github/following',
    tags: ['GitHub'],
    summary: 'People on Social Dev you follow on GitHub',
    middleware: [requireSession] as const,
    responses: {
      200: {
        description: 'Accounts linked to the GitHub users you follow',
        content: json(
          z.object({
            items: z.array(
              z.object({
                id: z.uuid(),
                username: z.string(),
                displayName: z.string(),
                bio: z.string(),
                avatarUrl: z.string().nullable(),
                followedByViewer: z.boolean(),
              }),
            ),
          }),
        ),
      },
      ...signedIn,
      404: { description: 'The account is not connected to GitHub' },
      502: { description: 'GitHub did not answer' },
    },
  }),
  followAll: createRoute({
    method: 'post',
    path: '/api/me/github/follow-all',
    tags: ['GitHub'],
    summary: 'Follow everyone on Social Dev you follow on GitHub',
    middleware: [requireSession] as const,
    responses: {
      200: {
        description: 'How many new follows were made',
        content: json(z.object({ followed: z.number().int() })),
      },
      ...signedIn,
      404: { description: 'The account is not connected to GitHub' },
      502: { description: 'GitHub did not answer' },
    },
  }),
};

async function viewer(c: Context<AppEnv>) {
  return { userId: currentUser(c).id, actorId: await requireActorId(c) };
}

/** Matched follows, turning GitHub problems into API errors. */
async function loadFollows(c: Context<AppEnv>) {
  try {
    const follows = await gitHubFollowsOnSocialDev(c.var.deps, await viewer(c));
    if (!follows) throw new AppError(404, 'github_not_connected', 'Connect GitHub first');
    return follows;
  } catch (error) {
    if (error instanceof GitHubError) {
      c.var.deps.logger.warn({ err: error }, 'GitHub following request failed');
      throw new AppError(502, 'github_unavailable', 'GitHub did not answer; try again later');
    }
    throw error;
  }
}

export const githubRoutes = new OpenAPIHono<AppEnv>()
  .openapi(routes.status, async (c) => {
    return c.json(await syncGitHub(c.var.deps, await viewer(c)), 200);
  })
  .openapi(routes.refresh, async (c) => {
    return c.json(await syncGitHub(c.var.deps, await viewer(c), MANUAL_REFRESH_AFTER_MS), 200);
  })
  .openapi(routes.settings, async (c) => {
    await setShowOnProfile(
      c.var.deps.db,
      await requireActorId(c),
      c.req.valid('json').showOnProfile,
    );
    return c.body(null, 204);
  })
  .openapi(routes.following, async (c) => {
    return c.json({ items: await loadFollows(c) }, 200);
  })
  .openapi(routes.followAll, async (c) => {
    const actorId = await requireActorId(c);
    const toFollow = (await loadFollows(c)).filter((person) => !person.followedByViewer);
    for (const person of toFollow) await followActor(c.var.deps.db, actorId, person.username);
    return c.json({ followed: toFollow.length }, 200);
  });
