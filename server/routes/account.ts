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

import { eq } from 'drizzle-orm';
import type { Context } from 'hono';

import { asUser } from '../db/scope';
import { serviceDb } from '../db/service-client';
import {
  chats,
  documentSummaries,
  documents,
  flashcards,
  messages,
  quizzes,
  spaces,
  users,
} from '../db/schema';
import { deleteUserVectors } from '../qdrant';
import type { HonoEnv } from '../types';

type Identity = { sub: string; email?: string } | null;

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
