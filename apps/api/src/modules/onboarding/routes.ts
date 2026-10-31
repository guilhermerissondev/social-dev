import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import type { AppEnv } from '../../app.ts';
import { requireActorId } from '../../auth/actor.ts';
import { currentUser, requireSession } from '../../auth/session.ts';
import { completeOnboarding, suggestPeople, suggestTags } from './service.ts';

const json = <T extends z.ZodType>(body: T) => ({ 'application/json': { schema: body } });

const signedIn = {
  401: { description: 'Not signed in' },
  409: { description: 'The signed-in account has no username yet' },
} as const;

const Limit = z.coerce.number().int().min(1).max(30).default(10);

const routes = {
  complete: createRoute({
    method: 'post',
    path: '/api/me/onboarding/complete',
    tags: ['Onboarding'],
    summary: 'Finish (or skip) onboarding',
    middleware: [requireSession] as const,
    responses: { 204: { description: 'Done' }, 401: { description: 'Not signed in' } },
  }),
  people: createRoute({
    method: 'get',
    path: '/api/me/suggestions/people',
    tags: ['Onboarding'],
    summary: 'People you may want to follow',
    middleware: [requireSession] as const,
    request: { query: z.object({ limit: Limit }) },
    responses: {
      200: {
        description: 'Suggestions, best first',
        content: json(
          z.object({
            items: z.array(
              z.object({
                id: z.uuid(),
                username: z.string(),
                displayName: z.string(),
                bio: z.string(),
                avatarUrl: z.string().nullable(),
                sharedTechnologies: z.array(z.string()),
                followedByFollowing: z.number().int(),
              }),
            ),
          }),
        ),
      },
      ...signedIn,
    },
  }),
  tags: createRoute({
    method: 'get',
    path: '/api/me/suggestions/tags',
    tags: ['Onboarding'],
    summary: 'Tags you may want to follow',
    middleware: [requireSession] as const,
    request: { query: z.object({ limit: Limit }) },
    responses: {
      200: {
        description: 'Tag names: your stack first, then popular ones',
        content: json(z.object({ items: z.array(z.string()) })),
      },
      ...signedIn,
    },
  }),
};

export const onboardingRoutes = new OpenAPIHono<AppEnv>()
  .openapi(routes.complete, async (c) => {
    await completeOnboarding(c.var.deps.db, currentUser(c).id);
    return c.body(null, 204);
  })
  .openapi(routes.people, async (c) => {
    const items = await suggestPeople(
      c.var.deps.db,
      await requireActorId(c),
      c.req.valid('query').limit,
    );
    return c.json({ items }, 200);
  })
  .openapi(routes.tags, async (c) => {
    const items = await suggestTags(
      c.var.deps.db,
      await requireActorId(c),
      c.req.valid('query').limit,
    );
    return c.json({ items }, 200);
  });
