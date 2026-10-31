import type { Context } from 'hono';

import type { AppEnv } from '../app.ts';
import { AppError } from '../errors.ts';
import { findActorIdByUser } from '../modules/profiles/service.ts';

/** The signed-in user's actor id, or null for visitors and accounts without a username. */
export async function viewerActorId(c: Context<AppEnv>): Promise<string | null> {
  // Several handlers and helpers ask for it in one request, so it is looked up once.
  if (c.var.viewerActorId !== undefined) return c.var.viewerActorId;
  const user = c.var.session?.user;
  const actorId = user ? await findActorIdByUser(c.var.deps.db, user.id) : null;
  c.set('viewerActorId', actorId);
  return actorId;
}

/** Like `viewerActorId`, for routes behind `requireSession` that need a profile. */
export async function requireActorId(c: Context<AppEnv>): Promise<string> {
  const actorId = await viewerActorId(c);
  if (!actorId) throw new AppError(409, 'username_required', 'Choose a username first');
  return actorId;
}
