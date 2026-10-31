import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { updateProfileSchema, usernameSchema } from '@social-dev/shared';

import type { Context } from 'hono';

import type { AppEnv } from '../../app.ts';
import { viewerActorId } from '../../auth/actor.ts';
import { currentUser, requireSession } from '../../auth/session.ts';
import { AppError } from '../../errors.ts';
import { getFollowStats } from '../social-graph/service.ts';
import { claimUsername, ensureLocalActor, getLocalProfile, updateProfile } from './service.ts';

const ProfileSchema = z
  .object({
    id: z.uuid(),
    username: z.string(),
    displayName: z.string(),
    bio: z.string(),
    location: z.string(),
    links: z.array(z.object({ label: z.string(), url: z.string() })),
    technologies: z.array(z.string()),
    avatarUrl: z.string().nullable(),
    createdAt: z.iso.datetime(),
    followersCount: z.number().int(),
    followingCount: z.number().int(),
    followedByViewer: z.boolean().openapi({ description: 'False when not signed in' }),
  })
  .openapi('Profile');

const json = <T extends z.ZodType>(schema: T) => ({ 'application/json': { schema } });

const getProfileRoute = createRoute({
  method: 'get',
  path: '/api/profiles/{username}',
  tags: ['Profiles'],
  summary: 'Public profile of a local account',
  request: { params: z.object({ username: z.string() }) },
  responses: {
    200: { description: 'Profile', content: json(ProfileSchema) },
    404: { description: 'No account with this username' },
  },
});

const updateProfileRoute = createRoute({
  method: 'put',
  path: '/api/me/profile',
  tags: ['Profiles'],
  summary: "Replace the signed-in user's profile",
  middleware: [requireSession] as const,
  request: { body: { required: true, content: json(updateProfileSchema) } },
  responses: {
    200: { description: 'Updated profile', content: json(ProfileSchema) },
    401: { description: 'Not signed in' },
    409: { description: 'The account has no username yet' },
  },
});

const claimUsernameRoute = createRoute({
  method: 'post',
  path: '/api/me/username',
  tags: ['Profiles'],
  summary: 'Choose a username for an account created through GitHub or GitLab',
  middleware: [requireSession] as const,
  request: {
    body: { required: true, content: json(z.object({ username: usernameSchema })) },
  },
  responses: {
    200: { description: 'Created profile', content: json(ProfileSchema) },
    401: { description: 'Not signed in' },
    409: { description: 'Username taken, or the account already has one' },
  },
});

async function loadProfile(c: Context<AppEnv>, username: string) {
  const profile = await getLocalProfile(c.var.deps.db, username);
  if (!profile) throw new AppError(404, 'not_found', 'Profile not found');
  const stats = await getFollowStats(c.var.deps.db, profile.id, await viewerActorId(c));
  return { ...profile, ...stats };
}

export const profileRoutes = new OpenAPIHono<AppEnv>()
  .openapi(getProfileRoute, async (c) => {
    return c.json(await loadProfile(c, c.req.valid('param').username), 200);
  })
  .openapi(updateProfileRoute, async (c) => {
    const user = currentUser(c);
    if (!user.username) {
      throw new AppError(409, 'username_required', 'Choose a username first');
    }
    // Repairs accounts whose actor could not be created at sign-up (see the auth database hooks).
    await ensureLocalActor(c.var.deps.db, user);
    await updateProfile(c.var.deps.db, user.id, c.req.valid('json'));
    return c.json(await loadProfile(c, user.username), 200);
  })
  .openapi(claimUsernameRoute, async (c) => {
    const user = currentUser(c);
    const { username } = c.req.valid('json');
    const result = await claimUsername(c.var.deps.db, user.id, username);
    if (result === 'taken') {
      throw new AppError(409, 'username_taken', 'This username is already taken');
    }
    if (result === 'already_set') {
      throw new AppError(409, 'username_already_set', 'This account already has a username');
    }
    return c.json(await loadProfile(c, username), 200);
  });
