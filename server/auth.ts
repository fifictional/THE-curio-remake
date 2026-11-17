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

import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

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
    /*
     * The mailer seam. Sending real email needs a provider decision, so the link
     * is written to `.local/reset-links.log` (and stdout) instead of being
     * silently dropped. Swapping this one function for Resend/SES/Postmark is
     * the whole integration.
     */
    sendResetPassword: async ({ user, url, token }) => {
      const target = process.env.RESET_LINKS_FILE ?? '.local/reset-links.log';
      const line = `[${new Date().toISOString()}] ${user.email} ${url} token=${token}\n`;
      console.log(`\n[auth] password reset for ${user.email}: ${url}\n`);
      try {
        await mkdir(dirname(target), { recursive: true });
        await appendFile(target, line, 'utf8');
      } catch (err) {
        console.warn('[auth] could not write the reset log:', (err as Error).message);
      }
    },
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
    // legacy (strangler) UI
    'http://localhost:3200',
    'http://localhost:3300',
    'http://localhost:3000',
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',').filter(Boolean) ?? []),
  ],
});
