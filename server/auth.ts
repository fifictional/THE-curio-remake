/**
 * Better Auth configuration.
 *
 * - email + password for v0 (no OAuth yet)
 * - Drizzle adapter over the same Postgres
 * - user ids are OUR uuids (see schema.ts: property `id`, column `user_uuid`),
 *   which is what makes the Cognito → Better Auth user migration a mapping
 *   rather than a data rewrite: a legacy `userUuid` becomes the auth id.
 *
 * Routes are mounted under /api/auth/* in app.ts.
 */

import 'dotenv/config';

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import { db } from './db/client';
import * as schema from './db/schema';

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3101',
  secret: process.env.BETTER_AUTH_SECRET ?? 'dev-only-insecure-secret-change-me',
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    // v0 runs locally; no email verification loop.
    requireEmailVerification: false,
  },
  advanced: {
    database: {
      // Keep uuid ids so they match the legacy userUuid values.
      generateId: () => crypto.randomUUID(),
    },
  },
  trustedOrigins: [
    'http://localhost:3101',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',').filter(Boolean) ?? []),
  ],
});
