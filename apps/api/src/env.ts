import { z } from 'zod';

/** Optional value where an empty string (e.g. `KEY=` in .env) counts as unset. */
const optional = z.preprocess((value) => (value === '' ? undefined : value), z.string().optional());

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    API_PORT: z.coerce.number().int().positive().default(4000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

    /** Public URL of the web app. Auth endpoints are served to browsers through it (/api/auth). */
    WEB_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32, 'must be at least 32 characters'),

    SMTP_URL: z.url({ protocol: /^smtps?$/ }),
    MAIL_FROM: z.string().min(1).default('Social Dev <no-reply@localhost>'),

    GITHUB_CLIENT_ID: optional,
    GITHUB_CLIENT_SECRET: optional,
    GITLAB_CLIENT_ID: optional,
    GITLAB_CLIENT_SECRET: optional,
  })
  .refine((env) => Boolean(env.GITHUB_CLIENT_ID) === Boolean(env.GITHUB_CLIENT_SECRET), {
    message: 'GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be set together',
    path: ['GITHUB_CLIENT_SECRET'],
  })
  .refine((env) => Boolean(env.GITLAB_CLIENT_ID) === Boolean(env.GITLAB_CLIENT_SECRET), {
    message: 'GITLAB_CLIENT_ID and GITLAB_CLIENT_SECRET must be set together',
    path: ['GITLAB_CLIENT_SECRET'],
  });

export type Env = z.infer<typeof envSchema>;

/** Validates environment variables and fails fast with a readable message. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
