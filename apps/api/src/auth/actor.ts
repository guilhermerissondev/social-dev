import type { Context } from 'hono';

import type { AppEnv } from '../app.ts';
import { AppError } from '../errors.ts';
import { findActorIdByUser } from '../modules/profiles/service.ts';

/** The signed-in user's actor id, or null for visitors and accounts without a username. */
export async function viewerActorId(c: Context<AppEnv>): Promise<string | null> {
  const user = c.var.session?.user;
  return user ? findActorIdByUser(c.var.deps.db, user.id) : null;
}

/** Like `viewerActorId`, for routes behind `requireSession` that need a profile. */
export async function requireActorId(c: Context<AppEnv>): Promise<string> {
  const actorId = await viewerActorId(c);
  if (!actorId) throw new AppError(409, 'username_required', 'Choose a username first');
  return actorId;
}
