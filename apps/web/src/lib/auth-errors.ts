const knownErrors = [
  'EMAIL_NOT_VERIFIED',
  'INVALID_EMAIL',
  'INVALID_EMAIL_OR_PASSWORD',
  'INVALID_USERNAME_OR_PASSWORD',
  'INVALID_TOKEN',
  'INVALID_USERNAME',
  'USERNAME_TOO_SHORT',
  'USERNAME_TOO_LONG',
  'USERNAME_IS_ALREADY_TAKEN',
  'USER_ALREADY_EXISTS',
  'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
  'PASSWORD_TOO_SHORT',
  'PASSWORD_TOO_LONG',
] as const;

export type AuthErrorKey = (typeof knownErrors)[number] | 'TOO_MANY_REQUESTS' | 'UNKNOWN';

/** Maps a Better Auth client error to a translation key under `Auth.errors`. */
export function authErrorKey(error: { code?: string | undefined; status: number }): AuthErrorKey {
  if (error.status === 429) return 'TOO_MANY_REQUESTS';
  const code = error.code;
  return knownErrors.find((known) => known === code) ?? 'UNKNOWN';
}
