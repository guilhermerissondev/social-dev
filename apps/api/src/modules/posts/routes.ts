import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { normalizeTag, postContentSchema, postInputSchema } from '@social-dev/shared';
import type { Context } from 'hono';

import type { AppEnv } from '../../app.ts';
import { requireActorId, viewerActorId } from '../../auth/actor.ts';
import { requireSession } from '../../auth/session.ts';
import { AppError } from '../../errors.ts';
import {
  createPost,
  deletePost,
  getPost,
  listPosts,
  listThread,
  previewPost,
  updatePost,
  type OwnPostResult,
} from './service.ts';
import { PostPageSchema, PostSchema } from './schemas.ts';

const PageQuery = z.object({
  before: z.uuid().optional().openapi({ description: 'Cursor from the previous page' }),
});

const PostParams = z.object({ id: z.uuid() });

const json = <T extends z.ZodType>(schema: T) => ({ 'application/json': { schema } });

const notSignedIn = { 401: { description: 'Not signed in' } } as const;
const notOwner = {
  403: { description: 'The post belongs to someone else' },
  404: { description: 'Post not found' },
} as const;

const routes = {
  create: createRoute({
    method: 'post',
    path: '/api/posts',
    tags: ['Posts'],
    summary: 'Publish a post, or reply to one with `replyToId`',
    middleware: [requireSession] as const,
    request: {
      body: {
        required: true,
        content: json(
          postInputSchema.extend({
            replyToId: z.uuid().optional().openapi({ description: 'Post being answered' }),
          }),
        ),
      },
    },
    responses: {
      201: { description: 'Published post', content: json(PostSchema) },
      ...notSignedIn,
      404: { description: 'The post being answered does not exist' },
      409: { description: 'The account has no username yet' },
    },
  }),
  thread: createRoute({
    method: 'get',
    path: '/api/posts/{id}/thread',
    tags: ['Posts'],
    summary: 'Replies in the conversation started by this post, oldest first',
    request: { params: PostParams },
    responses: {
      200: {
        description: 'Replies; build the tree from `replyTo`',
        content: json(z.object({ items: z.array(PostSchema) })),
      },
    },
  }),
  preview: createRoute({
    method: 'post',
    path: '/api/posts/preview',
    tags: ['Posts'],
    summary: 'Render Markdown the way a published post would look',
    middleware: [requireSession] as const,
    request: {
      body: { required: true, content: json(z.object({ content: postContentSchema })) },
    },
    responses: {
      200: { description: 'Rendered HTML', content: json(z.object({ html: z.string() })) },
      ...notSignedIn,
    },
  }),
  get: createRoute({
    method: 'get',
    path: '/api/posts/{id}',
    tags: ['Posts'],
    summary: 'A post',
    request: { params: PostParams },
    responses: {
      200: { description: 'Post', content: json(PostSchema) },
      404: { description: 'Post not found' },
    },
  }),
  update: createRoute({
    method: 'put',
    path: '/api/posts/{id}',
    tags: ['Posts'],
    summary: 'Edit one of your posts',
    middleware: [requireSession] as const,
    request: { params: PostParams, body: { required: true, content: json(postInputSchema) } },
    responses: {
      200: { description: 'Edited post', content: json(PostSchema) },
      ...notSignedIn,
      ...notOwner,
    },
  }),
  delete: createRoute({
    method: 'delete',
    path: '/api/posts/{id}',
    tags: ['Posts'],
    summary: 'Delete one of your posts',
    middleware: [requireSession] as const,
    request: { params: PostParams },
    responses: { 204: { description: 'Deleted' }, ...notSignedIn, ...notOwner },
  }),
  byAuthor: createRoute({
    method: 'get',
    path: '/api/profiles/{username}/posts',
    tags: ['Posts'],
    summary: 'Posts of a local account, newest first',
    request: { params: z.object({ username: z.string() }), query: PageQuery },
    responses: { 200: { description: 'A page of posts', content: json(PostPageSchema) } },
  }),
  feed: createRoute({
    method: 'get',
    path: '/api/feed',
    tags: ['Posts'],
    summary: 'The "Following" feed: your posts, people you follow and tags you follow',
    middleware: [requireSession] as const,
    request: { query: PageQuery },
    responses: {
      200: { description: 'A page of posts, newest first', content: json(PostPageSchema) },
      ...notSignedIn,
      409: { description: 'The account has no username yet' },
    },
  }),
  byTag: createRoute({
    method: 'get',
    path: '/api/tags/{name}/posts',
    tags: ['Posts'],
    summary: 'Posts with a hashtag, newest first',
    request: { params: z.object({ name: z.string() }), query: PageQuery },
    responses: { 200: { description: 'A page of posts', content: json(PostPageSchema) } },
  }),
};

function assertOwner(result: OwnPostResult) {
  if (result === 'not_found') throw new AppError(404, 'not_found', 'Post not found');
  if (result === 'forbidden') {
    throw new AppError(403, 'forbidden', 'You can only change your own posts');
  }
}

async function loadPost(c: Context<AppEnv>, id: string) {
  const post = await getPost(c.var.deps.db, id, await viewerActorId(c));
  if (!post) throw new AppError(404, 'not_found', 'Post not found');
  return post;
}

export const postRoutes = new OpenAPIHono<AppEnv>()
  .openapi(routes.create, async (c) => {
    const { replyToId, ...input } = c.req.valid('json');
    const result = await createPost(c.var.deps.db, await requireActorId(c), input, replyToId);
    if (result === 'parent_not_found') {
      throw new AppError(404, 'not_found', 'The post being answered does not exist');
    }
    return c.json(await loadPost(c, result.id), 201);
  })
  .openapi(routes.thread, async (c) => {
    const items = await listThread(c.var.deps.db, c.req.valid('param').id, await viewerActorId(c));
    return c.json({ items }, 200);
  })
  .openapi(routes.preview, async (c) => {
    return c.json({ html: await previewPost(c.var.deps.db, c.req.valid('json').content) }, 200);
  })
  .openapi(routes.get, async (c) => {
    return c.json(await loadPost(c, c.req.valid('param').id), 200);
  })
  .openapi(routes.update, async (c) => {
    const { id } = c.req.valid('param');
    assertOwner(await updatePost(c.var.deps.db, id, await requireActorId(c), c.req.valid('json')));
    return c.json(await loadPost(c, id), 200);
  })
  .openapi(routes.delete, async (c) => {
    const { id } = c.req.valid('param');
    assertOwner(await deletePost(c.var.deps.db, id, await requireActorId(c)));
    return c.body(null, 204);
  })
  .openapi(routes.byAuthor, async (c) => {
    const { username } = c.req.valid('param');
    const page = await listPosts(
      c.var.deps.db,
      { kind: 'author', username },
      { before: c.req.valid('query').before, viewerId: await viewerActorId(c) },
    );
    return c.json(page, 200);
  })
  .openapi(routes.feed, async (c) => {
    const actorId = await requireActorId(c);
    const page = await listPosts(
      c.var.deps.db,
      { kind: 'feed', actorId },
      { before: c.req.valid('query').before, viewerId: actorId },
    );
    return c.json(page, 200);
  })
  .openapi(routes.byTag, async (c) => {
    // Unknown or invalid tags simply have no posts.
    const name = normalizeTag(c.req.valid('param').name);
    const page = name
      ? await listPosts(
          c.var.deps.db,
          { kind: 'tag', name },
          { before: c.req.valid('query').before, viewerId: await viewerActorId(c) },
        )
      : { items: [], nextCursor: null };
    return c.json(page, 200);
  });
