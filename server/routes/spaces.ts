/**
 * Folder membership.
 *
 * `SpaceUsers` (level 0 owner / 1 editor / 2 viewer) existed in the old app and
 * the rows were migrated, but nothing could invite anyone: the policies made a
 * folder visible only to its creator. These routes are the write side; the read
 * side is RLS (see `server/db/rls.ts`), so a member sees the folder, its
 * documents and its chats by policy rather than by route logic.
 *
 * Membership writes run on the service connection because the caller is not the
 * member being added. Every call checks the caller's own level first, and owners
 * cannot be removed or demoted here.
 */

import { and, eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { z } from 'zod';

import { cacheInvalidateModel } from './db';
import { serviceDb } from '../db/service-client';
import { spaceUsers, spaces, users } from '../db/schema';
import { getValidatedBody, validateBody } from '../middleware/validate';
import type { HonoEnv } from '../types';

type Identity = { sub: string } | null;

const InviteArgs = z.object({
  email: z.string().email(),
  /** 1 = editor, 2 = viewer. Owner (0) is not assignable. */
  level: z.coerce.number().int().min(1).max(2).default(2),
});

export const inviteValidate = validateBody(InviteArgs);

/**
 * The caller's level in a space, or null when they are not a member.
 *
 * `spaces.user_uuid` is the source of truth for the owner (older rows may lack a
 * `space_users` entry); everything else comes from the membership table.
 */
async function levelOf(spaceUuid: string, userUuid: string): Promise<number | null> {
  const [space] = await serviceDb
    .select({ owner: spaces.userUuid })
    .from(spaces)
    .where(eq(spaces.spaceUuid, spaceUuid))
    .limit(1);

  if (!space) return null;
  if (space.owner === userUuid) return 0;

  const [row] = await serviceDb
    .select({ level: spaceUsers.level })
    .from(spaceUsers)
    .where(and(eq(spaceUsers.spaceUuid, spaceUuid), eq(spaceUsers.userUuid, userUuid)))
    .limit(1);
  return row?.level ?? null;
}

/** GET /spaces/:spaceUuid/members — any member may see the list. */
export async function listMembers(c: Context<HonoEnv>): Promise<Response> {
  const identity = c.var.identity as Identity;
  if (!identity) return c.json({ success: false, error: 'Not signed in' }, 401);

  const spaceUuid = c.req.param('spaceUuid')!;
  const level = await levelOf(spaceUuid, identity.sub);
  if (level === null) return c.json({ success: false, error: 'Space not found' }, 404);

  const rows = await serviceDb
    .select({
      userUuid: spaceUsers.userUuid,
      level: spaceUsers.level,
      createdAt: spaceUsers.createdAt,
      email: users.email,
      name: users.name,
    })
    .from(spaceUsers)
    .leftJoin(users, eq(users.id, spaceUsers.userUuid))
    .where(eq(spaceUsers.spaceUuid, spaceUuid));

  return c.json({
    success: true,
    members: rows.map((row) => ({
      userUuid: row.userUuid,
      email: row.email ?? null,
      name: row.name ?? null,
      level: row.level,
      createdAt: row.createdAt,
    })),
  });
}

/** POST /spaces/:spaceUuid/members — owner or editor invites by email. */
export async function inviteMember(c: Context<HonoEnv>): Promise<Response> {
  const identity = c.var.identity as Identity;
  if (!identity) return c.json({ success: false, error: 'Not signed in' }, 401);

  const spaceUuid = c.req.param('spaceUuid')!;
  const level = await levelOf(spaceUuid, identity.sub);
  if (level === null) return c.json({ success: false, error: 'Space not found' }, 404);
  if (level > 1) return c.json({ success: false, error: 'Only the owner or an editor can invite' }, 403);

  const input = getValidatedBody<typeof InviteArgs>(c);
  const email = input.email.trim().toLowerCase();

  const [target] = await serviceDb.select().from(users).where(eq(users.email, email)).limit(1);
  if (!target) {
    return c.json({ success: false, error: 'No Curio account uses that email' }, 404);
  }
  if (target.id === identity.sub) {
    return c.json({ success: false, error: 'You already have access' }, 400);
  }

  const [existing] = await serviceDb
    .select()
    .from(spaceUsers)
    .where(and(eq(spaceUsers.spaceUuid, spaceUuid), eq(spaceUsers.userUuid, target.id)))
    .limit(1);

  if (existing) {
    // Changing the owner's level would orphan the folder.
    if (existing.level === 0) {
      return c.json({ success: false, error: 'That member owns the folder' }, 400);
    }
    await serviceDb
      .update(spaceUsers)
      .set({ level: input.level, updatedAt: new Date() })
      .where(and(eq(spaceUsers.spaceUuid, spaceUuid), eq(spaceUsers.userUuid, target.id)));
    // Membership changes what the *invitee* can see; drop the read caches.
    cacheInvalidateModel('SpaceUsers');
    return c.json({ success: true, member: { userUuid: target.id, email, level: input.level } });
  }

  await serviceDb.insert(spaceUsers).values({
    spaceUsersUuid: crypto.randomUUID(),
    spaceUuid,
    userUuid: target.id,
    level: input.level,
    levelCreatedAt: `${input.level}#${new Date().toISOString()}`,
  });

  cacheInvalidateModel('SpaceUsers');
  return c.json({ success: true, member: { userUuid: target.id, email, level: input.level } });
}

/** DELETE /spaces/:spaceUuid/members/:userUuid — owner only; never the owner. */
export async function removeMember(c: Context<HonoEnv>): Promise<Response> {
  const identity = c.var.identity as Identity;
  if (!identity) return c.json({ success: false, error: 'Not signed in' }, 401);

  const spaceUuid = c.req.param('spaceUuid')!;
  const targetUuid = c.req.param('userUuid')!;

  const [space] = await serviceDb
    .select({ owner: spaces.userUuid })
    .from(spaces)
    .where(eq(spaces.spaceUuid, spaceUuid))
    .limit(1);
  if (!space) return c.json({ success: false, error: 'Space not found' }, 404);
  if (space.owner !== identity.sub) {
    return c.json({ success: false, error: 'Only the owner can remove members' }, 403);
  }
  if (targetUuid === space.owner) {
    return c.json({ success: false, error: 'The owner cannot be removed' }, 400);
  }

  await serviceDb
    .delete(spaceUsers)
    .where(and(eq(spaceUsers.spaceUuid, spaceUuid), eq(spaceUsers.userUuid, targetUuid)));

  cacheInvalidateModel('SpaceUsers');
  return c.json({ success: true, removed: targetUuid });
}
