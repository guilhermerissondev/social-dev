import { schema, type Database } from '@social-dev/db';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { username } from 'better-auth/plugins';

import type { Env } from '../env.ts';
import type { Logger } from '../logger.ts';
import type { Mailer } from '../mail/mailer.ts';
import { resetPasswordEmail, verificationEmail } from '../mail/templates.ts';

export const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

export interface AuthDeps {
  db: Database;
  env: Pick<
    Env,
    | 'WEB_URL'
    | 'BETTER_AUTH_SECRET'
    | 'GITHUB_CLIENT_ID'
    | 'GITHUB_CLIENT_SECRET'
    | 'GITLAB_CLIENT_ID'
    | 'GITLAB_CLIENT_SECRET'
    | 'CLIENT_IP_HEADER'
  >;
  mailer: Mailer;
  logger: Logger;
  /** Disable only in tests, where every request comes from the same address. */
  rateLimit?: boolean;
}

function socialProviders(env: AuthDeps['env']): BetterAuthOptions['socialProviders'] {
  return {
    ...(env.GITHUB_CLIENT_ID &&
      env.GITHUB_CLIENT_SECRET && {
        github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET },
      }),
    ...(env.GITLAB_CLIENT_ID &&
      env.GITLAB_CLIENT_SECRET && {
        gitlab: { clientId: env.GITLAB_CLIENT_ID, clientSecret: env.GITLAB_CLIENT_SECRET },
      }),
  };
}

export function createAuth({ db, env, mailer, logger, rateLimit = true }: AuthDeps) {
  // Emails are sent in the background so response times do not reveal whether an account exists.
  const sendInBackground = (message: Parameters<Mailer['send']>[0]) => {
    mailer.send(message).catch((error: unknown) => {
      logger.error({ err: error, subject: message.subject }, 'failed to send email');
    });
  };

  return betterAuth({
    appName: 'Social Dev',
    // Browsers reach auth through the web app, which proxies /api/* to this API.
    baseURL: env.WEB_URL,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.WEB_URL],
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
      },
    }),
    advanced: {
      // Let PostgreSQL generate UUIDv7 ids.
      database: { generateId: false },
      ...(env.CLIENT_IP_HEADER && {
        ipAddress: { ipAddressHeaders: [env.CLIENT_IP_HEADER] },
      }),
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        sendInBackground(resetPasswordEmail(user, url));
        return Promise.resolve();
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      // Signing in with an unverified email sends a fresh link.
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        sendInBackground(verificationEmail(user, url));
        return Promise.resolve();
      },
    },
    socialProviders: socialProviders(env),
    account: {
      accountLinking: {
        enabled: true,
        // Only link automatically when the provider has verified the email address.
        trustedProviders: ['github', 'gitlab'],
      },
    },
    rateLimit: {
      enabled: rateLimit,
      window: 60,
      max: 100,
      customRules: {
        '/sign-up/email': { window: 60 * 60, max: 5 },
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-in/username': { window: 60, max: 5 },
        '/request-password-reset': { window: 60 * 60, max: 3 },
      },
    },
    plugins: [
      username({
        minUsernameLength: 3,
        maxUsernameLength: 30,
        usernameValidator: (value) => USERNAME_PATTERN.test(value),
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
