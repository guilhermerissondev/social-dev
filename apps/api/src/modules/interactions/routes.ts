import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import type { AppEnv } from '../../app.ts';
import { requireActorId } from '../../auth/actor.ts';
import { requireSession } from '../../auth/session.ts';
import { AppError } from '../../errors.ts';
import { PostPageSchema } from '../posts/schemas.ts';
import { listBookmarkedPosts } from '../posts/service.ts';
import { addInteraction, removeInteraction, type InteractionKind } from './service.ts';

const responses = {
  204: { description: 'Done. Repeating the request is not an error.' },
  401: { description: 'Not signed in' },
  404: { description: 'Post not found' },
  409: { description: 'The signed-in account has no username yet' },
} as const;

const PostParams = z.object({ id: z.uuid() });

function interactionRoute(kind: InteractionKind, method: 'post' | 'delete', summary: string) {
  return createRoute({
    method,
    path: `/api/posts/{id}/${kind}`,
    tags: ['Interactions'],
    summary,
    middleware: [requireSession] as const,
    request: { params: PostParams },
    responses,
  });
}

const bookmarksRoute = createRoute({
  method: 'get',
  path: '/api/me/bookmarks',
  tags: ['Interactions'],
  summary: 'Posts you saved, most recently saved first',
  middleware: [requireSession] as const,
  request: { query: z.object({ cursor: z.string().optional() }) },
  responses: {
    200: {
      description: 'A page of posts',
      content: { 'application/json': { schema: PostPageSchema } },
    },
    401: { description: 'Not signed in' },
    409: { description: 'The signed-in account has no username yet' },
  },
});

const app = new OpenAPIHono<AppEnv>();

for (const kind of ['like', 'bookmark'] as const) {
  const noun = kind === 'like' ? 'Like' : 'Save';

  app.openapi(interactionRoute(kind, 'post', `${noun} a post`), async (c) => {
    const result = await addInteraction(
      c.var.deps.db,
      kind,
      await requireActorId(c),
      c.req.valid('param').id,
    );
    if (result === 'not_found') throw new AppError(404, 'not_found', 'Post not found');
    return c.body(null, 204);
  });
  app.openapi(interactionRoute(kind, 'delete', `Undo: ${noun.toLowerCase()} a post`), async (c) => {
    const result = await removeInteraction(
      c.var.deps.db,
      kind,
      await requireActorId(c),
      c.req.valid('param').id,
    );
    if (result === 'not_found') throw new AppError(404, 'not_found', 'Post not found');
    return c.body(null, 204);
  });
}

app.openapi(bookmarksRoute, async (c) => {
  const page = await listBookmarkedPosts(
    c.var.deps.db,
    await requireActorId(c),
    c.req.valid('query').cursor,
  );
  return c.json(page, 200);
});

export const interactionRoutes = app;
