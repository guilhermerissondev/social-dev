import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { id, timestamps } from './columns.ts';

// Tables used by Better Auth (core schema + username plugin).
// See docs/adr/0006-autenticacao-e-cadastro.md.

export const users = pgTable('users', {
  id: id(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  /** Normalized (lowercase) handle. Immutable once federation is enabled. */
  username: text().unique(),
  /** Handle as the user typed it, preserving case. */
  displayUsername: text(),
  /** When the person finished or skipped onboarding. Until then, the feed sends them there. */
  onboardingCompletedAt: timestamp({ withTimezone: true }),
  ...timestamps,
});

export const sessions = pgTable(
  'sessions',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text().notNull().unique(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ipAddress: text(),
    userAgent: text(),
    ...timestamps,
  },
  (table) => [index().on(table.userId)],
);

/** Login methods linked to a user: one row per OAuth provider, plus "credential" for email and password. */
export const accounts = pgTable(
  'accounts',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerId: text().notNull(),
    accountId: text().notNull(),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    ...timestamps,
  },
  (table) => [index().on(table.userId), uniqueIndex().on(table.providerId, table.accountId)],
);

/** Short-lived tokens for email verification and password reset. */
export const verifications = pgTable(
  'verifications',
  {
    id: id(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [index().on(table.identifier)],
);
