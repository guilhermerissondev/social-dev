import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { pingDatabase } from '@social-dev/db';

import type { AppEnv } from '../app.ts';

const HealthSchema = z
  .object({
    status: z.enum(['ok', 'degraded']),
    checks: z.object({ database: z.enum(['up', 'down']) }),
  })
  .openapi('Health');

const route = createRoute({
  method: 'get',
  path: '/health',
  tags: ['System'],
  summary: 'Service health',
  responses: {
    200: {
      description: 'Service is healthy',
      content: { 'application/json': { schema: HealthSchema } },
    },
    503: {
      description: 'A dependency is unavailable',
      content: { 'application/json': { schema: HealthSchema } },
    },
  },
});

export const healthRoutes = new OpenAPIHono<AppEnv>().openapi(route, async (c) => {
  const { db, logger } = c.var.deps;
  try {
    await pingDatabase(db);
    return c.json({ status: 'ok' as const, checks: { database: 'up' as const } }, 200);
  } catch (error) {
    logger.error({ err: error }, 'database health check failed');
    return c.json({ status: 'degraded' as const, checks: { database: 'down' as const } }, 503);
  }
});
