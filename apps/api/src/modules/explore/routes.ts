import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { normalizeTag } from '@social-dev/shared';

import type { AppEnv } from '../../app.ts';
import { viewerActorId } from '../../auth/actor.ts';
import { PostPageSchema } from '../posts/schemas.ts';
import { explorePeriods, listPopularPosts, listTrendingTags } from './service.ts';

const json = <T extends z.ZodType>(body: T) => ({ 'application/json': { schema: body } });

const Period = z.enum(explorePeriods).default('week');

const routes = {
  posts: createRoute({
    method: 'get',
    path: '/api/explore/posts',
    tags: ['Explore'],
    summary: 'Popular posts of the period, optionally with a tag',
    request: {
      query: z.object({
        period: Period,
        tag: z.string().optional(),
        cursor: z.string().optional().openapi({ description: 'From the previous page' }),
      }),
    },
    responses: { 200: { description: 'A page of posts', content: json(PostPageSchema) } },
  }),
  tags: createRoute({
    method: 'get',
    path: '/api/explore/tags',
    tags: ['Explore'],
    summary: 'Tags used in the most posts of the period',
    request: { query: z.object({ period: Period }) },
    responses: {
      200: {
        description: 'Trending tags',
        content: json(
          z.object({
            items: z.array(z.object({ name: z.string(), postsCount: z.number().int() })),
          }),
        ),
      },
    },
  }),
};

export const exploreRoutes = new OpenAPIHono<AppEnv>()
  .openapi(routes.posts, async (c) => {
    const { period, tag, cursor } = c.req.valid('query');
    // An invalid tag matches no posts.
    const name = tag === undefined ? undefined : normalizeTag(tag);
    if (name === null) return c.json({ items: [], nextCursor: null }, 200);

    const page = await listPopularPosts(c.var.deps.db, {
      period,
      tag: name,
      cursor,
      viewerId: await viewerActorId(c),
    });
    return c.json(page, 200);
  })
  .openapi(routes.tags, async (c) => {
    const items = await listTrendingTags(c.var.deps.db, c.req.valid('query').period);
    return c.json({ items }, 200);
  });
