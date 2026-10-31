import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import type { AppEnv } from '../app.ts';
import { currentUser, requireSession } from '../auth/session.ts';

const MeSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    username: z.string().nullable(),
    email: z.email(),
    emailVerified: z.boolean(),
    image: z.string().nullable(),
  })
  .openapi('Me');

const route = createRoute({
  method: 'get',
  path: '/api/me',
  tags: ['Account'],
  summary: 'The signed-in user',
  middleware: [requireSession] as const,
  responses: {
    200: { description: 'Current user', content: { 'application/json': { schema: MeSchema } } },
    401: { description: 'Not signed in' },
  },
});

export const meRoutes = new OpenAPIHono<AppEnv>().openapi(route, (c) => {
  const user = currentUser(c);

  return c.json(
    {
      id: user.id,
      name: user.name,
      username: user.username ?? null,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image ?? null,
    },
    200,
  );
});
