import 'server-only';

import { getLocale } from 'next-intl/server';

import { redirect } from '@/i18n/navigation.ts';

import { getSessionUser, type SessionUser } from './session.ts';

/** Sends signed-in users away from pages such as login and sign up. */
export async function redirectIfSignedIn(): Promise<void> {
  if (await getSessionUser()) {
    redirect({ href: '/home', locale: await getLocale() });
  }
}

/** Returns the signed-in user or redirects to the login page. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    return redirect({ href: '/login', locale: await getLocale() });
  }
  return user;
}
