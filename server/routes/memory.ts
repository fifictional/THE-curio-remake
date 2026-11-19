/**
 * Memory: what Curio remembers about a learner.
 *
 * The blocks were migrated (topic/subject/description, `knowledge_gap` and
 * `mastered_topic`). The *writing* half — the reflection agent that creates new
 * blocks — needs a model, so this route is deliberately read-only plus the two
 * controls a user must always have: turn it off, and delete everything.
 */

import { eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { z } from 'zod';

import { asUser } from '../db/scope';
import { getValidatedBody, validateBody } from '../middleware/validate';
import { serviceDb } from '../db/service-client';
import { memoryBlocks, memoryCandidates, users } from '../db/schema';
import type { HonoEnv } from '../types';

type Identity = { sub: string } | null;

const ToggleArgs = z.object({ enabled: z.boolean() });
export const memoryToggleValidate = validateBody(ToggleArgs);

interface BlockPayload {
  topic?: string;
  subject?: string;
  description?: string;
  evidence?: string;
  askedCount?: number;
}

export async function getMemory(c: Context<HonoEnv>): Promise<Response> {
  const identity = c.var.identity as Identity;
  if (!identity) return c.json({ success: false, error: 'Not signed in' }, 401);

  const [profile] = await serviceDb
    .select({ memoryDisabled: users.memoryDisabled })
    .from(users)
    .where(eq(users.id, identity.sub))
    .limit(1);

  // RLS scopes memory_blocks by owner_uuid; no filter needed here.
  const rows = await asUser(identity.sub, (db) =>
    db
      .select({
        memoryBlockUuid: memoryBlocks.memoryBlockUuid,
        scope: memoryBlocks.scope,
        blockType: memoryBlocks.blockType,
        topic: memoryBlocks.topic,
        subject: memoryBlocks.subject,
        payload: memoryBlocks.payload,
        updatedAt: memoryBlocks.updatedAt,
      })
      .from(memoryBlocks)
      .orderBy(memoryBlocks.updatedAt),
  );

  return c.json({
    success: true,
    enabled: !profile?.memoryDisabled,
    blocks: rows.map((row) => {
      const payload = (row.payload ?? {}) as BlockPayload;
      return {
        memoryBlockUuid: row.memoryBlockUuid,
        scope: row.scope,
        blockType: row.blockType,
        topic: payload.topic ?? row.topic,
        subject: payload.subject ?? row.subject,
        description: payload.description ?? null,
        evidence: payload.evidence ?? null,
        askedCount: payload.askedCount ?? null,
        updatedAt: row.updatedAt,
      };
    }),
  });
}

export async function setMemoryEnabled(c: Context<HonoEnv>): Promise<Response> {
  const identity = c.var.identity as Identity;
  if (!identity) return c.json({ success: false, error: 'Not signed in' }, 401);

  const input = getValidatedBody<typeof ToggleArgs>(c);
  await serviceDb
    .update(users)
    .set({ memoryDisabled: !input.enabled, updatedAt: new Date() })
    .where(eq(users.id, identity.sub));

  return c.json({ success: true, enabled: input.enabled });
}

/** Delete every memory block and candidate the caller owns. */
export async function clearMemory(c: Context<HonoEnv>): Promise<Response> {
  const identity = c.var.identity as Identity;
  if (!identity) return c.json({ success: false, error: 'Not signed in' }, 401);

  // Both tables are owner-scoped by RLS, so `asUser` is enough.
  await asUser(identity.sub, async (db) => {
    await db.delete(memoryBlocks).where(eq(memoryBlocks.ownerUuid, identity.sub));
    await db.delete(memoryCandidates).where(eq(memoryCandidates.ownerUuid, identity.sub));
  });

  return c.json({ success: true, cleared: true });
}

export async function exportMemory(c: Context<HonoEnv>): Promise<Response> {
  const identity = c.var.identity as Identity;
  if (!identity) return c.json({ success: false, error: 'Not signed in' }, 401);

  const rows = await asUser(identity.sub, (db) => db.select().from(memoryBlocks));

  return c.body(
    JSON.stringify({ exportedAt: new Date().toISOString(), blocks: rows }, null, 2),
    200,
    {
      'content-type': 'application/json',
      'content-disposition': `attachment; filename="curio-memory-${identity.sub}.json"`,
    },
  );
}
