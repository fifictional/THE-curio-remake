/**
 * Account export and deletion.
 *
 * Export is a GDPR-style dump of the caller's own data (RLS-scoped reads).
 * Deletion removes the user row (every child row cascades), their objects on
 * disk, and their vectors — in that order is wrong: vectors and files are
 * removed first, because after the row is gone we can no longer find them.
 */

import { rm } from 'node:fs/promises';
import { join, normalize } from 'node:path';

import { and, eq, inArray } from 'drizzle-orm';
import type { Context } from 'hono';

import { getValidatedBody, validateBody } from '../middleware/validate';
import { asUser } from '../db/scope';
import { serviceDb } from '../db/service-client';
import {
  chats,
  documentSummaries,
  documents,
  flashcards,
  messages,
  metadata,
  quizzes,
  spaces,
  users,
} from '../db/schema';
import { deleteUserVectors } from '../qdrant';
import type { HonoEnv } from '../types';
import { z } from 'zod';

type Identity = { sub: string; email?: string } | null;

/**
 * Onboarding answers + the completion flag.
 *
 * Counselled into one endpoint rather than the bridge: `UserProfile` maps to the
 * `users` table, which has no RLS (Better Auth writes it before a user context
 * exists), so a generic update would let any caller change any row. This touches
 * only the caller's own row.
 */
export const OnboardingArgs = z.object({
  // Skipping from step 1 sends nulls for the answers, which is fine.
  lifestage: z.string().max(60).nullish(),
  intents: z.array(z.string().max(60)).max(10).nullish(),
  completed: z.boolean().optional(),
  skipped: z.boolean().optional(),
});

export const onboardingValidate = validateBody(OnboardingArgs);

export async function saveOnboarding(c: Context<HonoEnv>): Promise<Response> {
  const identity = c.var.identity as Identity;
  if (!identity) return c.json({ success: false, error: 'Not signed in' }, 401);

  const input = getValidatedBody<typeof OnboardingArgs>(c);

  if (input.lifestage || input.intents?.length) {
    await serviceDb.delete(metadata).where(
      and(
        eq(metadata.targetUuid, identity.sub),
        eq(metadata.targetType, 'user'),
        inArray(metadata.name, ['lifestage', 'intents']),
      ),
    );

    const rows = [];
    if (input.lifestage) rows.push({ name: 'lifestage', value: input.lifestage });
    if (input.intents?.length) rows.push({ name: 'intents', value: input.intents.join(',') });
    for (const row of rows) {
      await serviceDb.insert(metadata).values({
        metadataUuid: crypto.randomUUID(),
        targetUuid: identity.sub,
        targetType: 'user',
        name: row.name,
        value: row.value,
      });
    }
  }

  if (input.completed || input.skipped) {
    await serviceDb
      .update(users)
      .set({
        onboardingCompleted: Boolean(input.completed),
        onboardingSkipped: Boolean(input.skipped),
        updatedAt: new Date(),
      })
      .where(eq(users.id, identity.sub));
  }

  return c.json({ success: true });
}

const FILES_ROOT = () => process.env.FILES_DIR ?? '.local/files';

/** GET /account/export — one JSON file with everything the caller owns. */
export async function exportAccount(c: Context<HonoEnv>): Promise<Response> {
  const identity = c.var.identity as Identity;
  if (!identity) return c.json({ success: false, error: 'Not signed in' }, 401);

  const data = await asUser(identity.sub, async (db) => {
    const [profile] = await db.select().from(users).where(eq(users.id, identity.sub)).limit(1);
    const docs = await db.select().from(documents);
    const summaries = await db.select().from(documentSummaries);
    const userChats = await db.select().from(chats);
    const userMessages = await db.select().from(messages);
    const cards = await db.select().from(flashcards);
    const userSpaces = await db.select().from(spaces);
    const userQuizzes = await db.select().from(quizzes);

    return {
      profile: profile
        ? {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName,
            country: profile.country,
            userDescription: profile.userDescription,
            createdAt: profile.createdAt,
          }
        : null,
      spaces: userSpaces,
      documents: docs,
      documentSummaries: summaries,
      chats: userChats,
      messages: userMessages,
      flashcards: cards,
      quizzes: userQuizzes,
    };
  });

  const body = JSON.stringify(
    { exportedAt: new Date().toISOString(), ...data },
    null,
    2,
  );

  return c.body(body, 200, {
    'content-type': 'application/json',
    'content-disposition': `attachment; filename="curio-export-${identity.sub}.json"`,
  });
}

/**
 * DELETE /account — permanently delete the caller.
 *
 * The body must repeat the account email: a destructive, irreversible action
 * should not be one stray fetch away.
 */
export async function deleteAccount(c: Context<HonoEnv>): Promise<Response> {
  const identity = c.var.identity as Identity;
  if (!identity) return c.json({ success: false, error: 'Not signed in' }, 401);

  const body = (await c.req.json().catch(() => ({}))) as { confirmEmail?: string };
  if ((body.confirmEmail ?? '').trim().toLowerCase() !== (identity.email ?? '').toLowerCase()) {
    return c.json({ success: false, error: 'confirmEmail does not match the account' }, 400);
  }

  // Vectors first: without the user row we cannot find them again.
  try {
    await deleteUserVectors(identity.sub);
  } catch (err) {
    console.warn('[account] vector cleanup failed:', (err as Error).message);
  }

  // Then the stored objects: student-documents/<userUuid>/…
  const userDir = normalize(join(FILES_ROOT(), 'student-documents', identity.sub));
  if (userDir.startsWith(normalize(FILES_ROOT()))) {
    await rm(userDir, { recursive: true, force: true });
  }

  // Finally the row; every child table cascades from users.
  await serviceDb.delete(users).where(eq(users.id, identity.sub));

  return c.json({ success: true, deleted: true });
}
