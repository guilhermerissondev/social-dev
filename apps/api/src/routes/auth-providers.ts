import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import type { AppEnv } from '../app.ts';

const ProvidersSchema = z
  .object({ providers: z.array(z.enum(['github', 'gitlab'])) })
  .openapi('AuthProviders');

const route = createRoute({
  method: 'get',
  path: '/api/auth-providers',
  tags: ['Account'],
  summary: 'OAuth providers enabled on this server',
  responses: {
    200: {
      description: 'Enabled providers',
      content: { 'application/json': { schema: ProvidersSchema } },
    },
  },
});

export const authProvidersRoutes = new OpenAPIHono<AppEnv>().openapi(route, (c) => {
  const configured = c.var.deps.auth.options.socialProviders ?? {};
  const providers = (['github', 'gitlab'] as const).filter((id) => id in configured);
  return c.json({ providers }, 200);
});
