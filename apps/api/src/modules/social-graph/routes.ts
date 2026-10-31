import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { normalizeTag } from '@social-dev/shared';
import type { Context } from 'hono';

import type { AppEnv } from '../../app.ts';
import { requireActorId, viewerActorId } from '../../auth/actor.ts';
import { requireSession } from '../../auth/session.ts';
import { AppError } from '../../errors.ts';
import { findLocalActorId } from '../profiles/service.ts';
import {
  followActor,
  followTag,
  getTagInfo,
  listFollows,
  unfollowActor,
  unfollowTag,
} from './service.ts';

const json = <T extends z.ZodType>(schema: T) => ({ 'application/json': { schema } });

const ProfileSummarySchema = z
  .object({
    id: z.uuid(),
    username: z.string(),
    displayName: z.string(),
    bio: z.string(),
    avatarUrl: z.string().nullable(),
  })
  .openapi('ProfileSummary');

const ProfilePageSchema = z
  .object({ items: z.array(ProfileSummarySchema), nextCursor: z.string().nullable() })
  .openapi('ProfilePage');

const TagSchema = z
  .object({
    name: z.string(),
    followersCount: z.number().int(),
    followedByViewer: z.boolean().openapi({ description: 'False when not signed in' }),
  })
  .openapi('Tag');

const UsernameParams = z.object({ username: z.string() });
const TagParams = z.object({ name: z.string() });
const CursorQuery = z.object({ cursor: z.string().optional() });

const followResponses = {
  204: { description: 'Done. Repeating the request is not an error.' },
  401: { description: 'Not signed in' },
  404: { description: 'No account with this username' },
  409: { description: 'The signed-in account has no username yet' },
} as const;

const tagFollowResponses = {
  204: { description: 'Done. Repeating the request is not an error.' },
  400: { description: 'Not a valid tag name' },
  401: { description: 'Not signed in' },
  409: { description: 'The signed-in account has no username yet' },
} as const;

const routes = {
  follow: createRoute({
    method: 'post',
    path: '/api/profiles/{username}/follow',
    tags: ['Social graph'],
    summary: 'Follow an account',
    middleware: [requireSession] as const,
    request: { params: UsernameParams },
    responses: { ...followResponses, 400: { description: 'You cannot follow yourself' } },
  }),
  unfollow: createRoute({
    method: 'delete',
    path: '/api/profiles/{username}/follow',
    tags: ['Social graph'],
    summary: 'Stop following an account',
    middleware: [requireSession] as const,
    request: { params: UsernameParams },
    responses: followResponses,
  }),
  followers: createRoute({
    method: 'get',
    path: '/api/profiles/{username}/followers',
    tags: ['Social graph'],
    summary: 'Accounts that follow this one, most recent first',
    request: { params: UsernameParams, query: CursorQuery },
    responses: {
      200: { description: 'A page of accounts', content: json(ProfilePageSchema) },
      404: { description: 'No account with this username' },
    },
  }),
  following: createRoute({
    method: 'get',
    path: '/api/profiles/{username}/following',
    tags: ['Social graph'],
    summary: 'Accounts this one follows, most recent first',
    request: { params: UsernameParams, query: CursorQuery },
    responses: {
      200: { description: 'A page of accounts', content: json(ProfilePageSchema) },
      404: { description: 'No account with this username' },
    },
  }),
  tag: createRoute({
    method: 'get',
    path: '/api/tags/{name}',
    tags: ['Social graph'],
    summary: 'A tag and its followers count',
    request: { params: TagParams },
    responses: {
      200: { description: 'Tag', content: json(TagSchema) },
      404: { description: 'Not a valid tag name' },
    },
  }),
  followTag: createRoute({
    method: 'post',
    path: '/api/tags/{name}/follow',
    tags: ['Social graph'],
    summary: 'Follow a tag',
    middleware: [requireSession] as const,
    request: { params: TagParams },
    responses: tagFollowResponses,
  }),
  unfollowTag: createRoute({
    method: 'delete',
    path: '/api/tags/{name}/follow',
    tags: ['Social graph'],
    summary: 'Stop following a tag',
    middleware: [requireSession] as const,
    request: { params: TagParams },
    responses: tagFollowResponses,
  }),
};

function tagName(raw: string, status: 400 | 404): string {
  const name = normalizeTag(raw);
  if (!name)
    throw new AppError(status, status === 404 ? 'not_found' : 'invalid_tag', 'Invalid tag');
  return name;
}

async function actorIdOf(c: Context<AppEnv>, username: string): Promise<string> {
  const actorId = await findLocalActorId(c.var.deps.db, username);
  if (!actorId) throw new AppError(404, 'not_found', 'Profile not found');
  return actorId;
}

export const socialGraphRoutes = new OpenAPIHono<AppEnv>()
  .openapi(routes.follow, async (c) => {
    const result = await followActor(
      c.var.deps.db,
      await requireActorId(c),
      c.req.valid('param').username,
    );
    if (result === 'not_found') throw new AppError(404, 'not_found', 'Profile not found');
    if (result === 'self')
      throw new AppError(400, 'cannot_follow_self', 'You cannot follow yourself');
    return c.body(null, 204);
  })
  .openapi(routes.unfollow, async (c) => {
    const result = await unfollowActor(
      c.var.deps.db,
      await requireActorId(c),
      c.req.valid('param').username,
    );
    if (result === 'not_found') throw new AppError(404, 'not_found', 'Profile not found');
    return c.body(null, 204);
  })
  .openapi(routes.followers, async (c) => {
    const actorId = await actorIdOf(c, c.req.valid('param').username);
    const page = await listFollows(
      c.var.deps.db,
      actorId,
      'followers',
      c.req.valid('query').cursor,
    );
    return c.json(page, 200);
  })
  .openapi(routes.following, async (c) => {
    const actorId = await actorIdOf(c, c.req.valid('param').username);
    const page = await listFollows(
      c.var.deps.db,
      actorId,
      'following',
      c.req.valid('query').cursor,
    );
    return c.json(page, 200);
  })
  .openapi(routes.tag, async (c) => {
    const name = tagName(c.req.valid('param').name, 404);
    return c.json(await getTagInfo(c.var.deps.db, name, await viewerActorId(c)), 200);
  })
  .openapi(routes.followTag, async (c) => {
    const name = tagName(c.req.valid('param').name, 400);
    await followTag(c.var.deps.db, await requireActorId(c), name);
    return c.body(null, 204);
  })
  .openapi(routes.unfollowTag, async (c) => {
    const name = tagName(c.req.valid('param').name, 400);
    await unfollowTag(c.var.deps.db, await requireActorId(c), name);
    return c.body(null, 204);
  });
