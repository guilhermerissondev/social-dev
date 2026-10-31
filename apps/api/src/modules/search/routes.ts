import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import type { AppEnv } from '../../app.ts';
import { viewerActorId } from '../../auth/actor.ts';
import { PostPageSchema } from '../posts/schemas.ts';
import { searchPeople, searchPosts, searchTags, SEARCH_PAGE_SIZE } from './service.ts';

const json = <T extends z.ZodType>(body: T) => ({ 'application/json': { schema: body } });

export const searchTypes = ['all', 'people', 'posts', 'tags'] as const;

/** How many people and tags the combined ("all") results show. */
const PREVIEW_SIZE = 5;

const route = createRoute({
  method: 'get',
  path: '/api/search',
  tags: ['Search'],
  summary: 'Search people, posts and tags',
  request: {
    query: z.object({
      q: z.string().trim().min(2).max(100),
      type: z.enum(searchTypes).default('all'),
      cursor: z.string().optional().openapi({ description: 'Next page of posts' }),
    }),
  },
  responses: {
    200: {
      description: 'Results. Only the requested type is filled, or all of them.',
      content: json(
        z.object({
          people: z.array(
            z.object({
              id: z.uuid(),
              username: z.string(),
              displayName: z.string(),
              bio: z.string(),
              avatarUrl: z.string().nullable(),
            }),
          ),
          tags: z.array(z.object({ name: z.string(), postsCount: z.number().int() })),
          posts: PostPageSchema,
        }),
      ),
    },
    400: { description: 'The query must have 2 to 100 characters' },
  },
});

export const searchRoutes = new OpenAPIHono<AppEnv>().openapi(route, async (c) => {
  const { q, type, cursor } = c.req.valid('query');
  const { db } = c.var.deps;
  const size = type === 'all' ? PREVIEW_SIZE : SEARCH_PAGE_SIZE;

  const [people, tags, posts] = await Promise.all([
    type === 'all' || type === 'people' ? searchPeople(db, q, size) : [],
    type === 'all' || type === 'tags' ? searchTags(db, q, size) : [],
    type === 'all' || type === 'posts'
      ? searchPosts(db, q, { cursor, viewerId: await viewerActorId(c) })
      : { items: [], nextCursor: null },
  ]);
  return c.json({ people, tags, posts }, 200);
});
