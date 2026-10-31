import { OpenAPIHono } from '@hono/zod-openapi';
import type { Database } from '@social-dev/db';
import { csrf } from 'hono/csrf';
import { HTTPException } from 'hono/http-exception';
import { requestId } from 'hono/request-id';

import type { Auth } from './auth/auth.ts';
import { loadSession } from './auth/session.ts';
import { AppError, errorBody } from './errors.ts';
import type { Logger } from './logger.ts';
import { postRoutes } from './modules/posts/routes.ts';
import { profileRoutes } from './modules/profiles/routes.ts';
import { socialGraphRoutes } from './modules/social-graph/routes.ts';
import { authProvidersRoutes } from './routes/auth-providers.ts';
import { healthRoutes } from './routes/health.ts';
import { meRoutes } from './routes/me.ts';

export interface AppDeps {
  db: Database;
  logger: Logger;
  auth: Auth;
  /** Origin of the web app, the only one allowed to send state-changing requests. */
  webUrl: string;
}

export type Session = Auth['$Infer']['Session'];

export interface AppEnv {
  Variables: {
    deps: AppDeps;
    requestId: string;
    session: Session | null;
  };
}

export function createApp(deps: AppDeps) {
  const app = new OpenAPIHono<AppEnv>({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(
          errorBody('validation_error', result.error.issues[0]?.message ?? 'Invalid request'),
          400,
        );
      }
      return undefined;
    },
  });

  app.use(requestId());
  app.use(async (c, next) => {
    c.set('deps', deps);
    const start = performance.now();
    await next();
    deps.logger.info(
      {
        requestId: c.var.requestId,
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        durationMs: Math.round(performance.now() - start),
      },
      'request completed',
    );
  });

  app.route('/', healthRoutes);

  app.on(['GET', 'POST'], '/api/auth/*', (c) => deps.auth.handler(c.req.raw));

  // Better Auth checks the origin of its own routes; this covers everything else.
  app.use('/api/*', csrf({ origin: deps.webUrl }));
  app.use('/api/*', loadSession);
  app.route('/', meRoutes);
  app.route('/', authProvidersRoutes);
  app.route('/', profileRoutes);
  app.route('/', postRoutes);
  app.route('/', socialGraphRoutes);

  app.doc31('/openapi.json', {
    openapi: '3.1.0',
    info: { title: 'Social Dev API', version: '0.0.0' },
  });

  app.notFound((c) => c.json(errorBody('not_found', 'Route not found'), 404));

  app.onError((error, c) => {
    if (error instanceof AppError) {
      return c.json(errorBody(error.code, error.message), error.status);
    }
    // Raised by Hono middleware, such as the CSRF check.
    if (error instanceof HTTPException && error.status < 500) {
      return c.json(errorBody('http_error', error.message), error.status);
    }
    deps.logger.error({ err: error, requestId: c.var.requestId }, 'unhandled error');
    return c.json(errorBody('internal_error', 'Something went wrong'), 500);
  });

  return app;
}
