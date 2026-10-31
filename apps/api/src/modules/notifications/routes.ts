import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { schema } from '@social-dev/db';

import type { AppEnv } from '../../app.ts';
import { requireActorId } from '../../auth/actor.ts';
import { requireSession } from '../../auth/session.ts';
import { countUnread, listNotifications, markRead } from './service.ts';

const json = <T extends z.ZodType>(body: T) => ({ 'application/json': { schema: body } });

const NotificationSchema = z
  .object({
    id: z.uuid(),
    type: z.enum(schema.notificationTypes),
    read: z.boolean(),
    createdAt: z.iso.datetime(),
    actor: z.object({
      username: z.string(),
      displayName: z.string(),
      avatarUrl: z.string().nullable(),
    }),
    post: z
      .object({
        id: z.uuid(),
        authorUsername: z.string(),
        title: z.string().nullable(),
        excerpt: z.string(),
      })
      .nullable(),
  })
  .openapi('Notification');

const signedIn = {
  401: { description: 'Not signed in' },
  409: { description: 'The signed-in account has no username yet' },
} as const;

const routes = {
  list: createRoute({
    method: 'get',
    path: '/api/notifications',
    tags: ['Notifications'],
    summary: 'Your notifications, newest first',
    middleware: [requireSession] as const,
    request: { query: z.object({ before: z.uuid().optional() }) },
    responses: {
      200: {
        description: 'A page of notifications',
        content: json(
          z.object({ items: z.array(NotificationSchema), nextCursor: z.uuid().nullable() }),
        ),
      },
      ...signedIn,
    },
  }),
  unreadCount: createRoute({
    method: 'get',
    path: '/api/notifications/unread-count',
    tags: ['Notifications'],
    summary: 'How many notifications you have not read',
    middleware: [requireSession] as const,
    responses: {
      200: { description: 'Unread count', content: json(z.object({ count: z.number().int() })) },
      ...signedIn,
    },
  }),
  markRead: createRoute({
    method: 'post',
    path: '/api/notifications/read',
    tags: ['Notifications'],
    summary: 'Mark notifications as read, up to and including the given one',
    middleware: [requireSession] as const,
    request: {
      body: {
        required: true,
        content: json(
          z.object({ upTo: z.uuid().openapi({ description: 'Newest notification seen' }) }),
        ),
      },
    },
    responses: { 204: { description: 'Marked as read' }, ...signedIn },
  }),
};

export const notificationRoutes = new OpenAPIHono<AppEnv>()
  .openapi(routes.list, async (c) => {
    const page = await listNotifications(
      c.var.deps.db,
      await requireActorId(c),
      c.req.valid('query').before,
    );
    return c.json(page, 200);
  })
  .openapi(routes.unreadCount, async (c) => {
    return c.json({ count: await countUnread(c.var.deps.db, await requireActorId(c)) }, 200);
  })
  .openapi(routes.markRead, async (c) => {
    await markRead(c.var.deps.db, await requireActorId(c), c.req.valid('json').upTo);
    return c.body(null, 204);
  });
