import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';

import type { AppEnv, Session } from '../app.ts';
import { AppError } from '../errors.ts';

/** Loads the current session (if any) into `c.var.session`. */
export const loadSession = createMiddleware<AppEnv>(async (c, next) => {
  const session = await c.var.deps.auth.api.getSession({ headers: c.req.raw.headers });
  c.set('session', session);
  await next();
});

/** Rejects the request with 401 when there is no signed-in user. */
export const requireSession = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.var.session) {
    throw new AppError(401, 'unauthorized', 'You need to sign in');
  }
  await next();
});

/** The signed-in user, for handlers behind `requireSession`. */
export function currentUser(c: Pick<Context<AppEnv>, 'var'>): Session['user'] {
  const user = c.var.session?.user;
  if (!user) throw new Error('currentUser called without requireSession');
  return user;
}
