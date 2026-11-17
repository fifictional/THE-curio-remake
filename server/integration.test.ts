/**
 * Integration tests against real Postgres + real Better Auth.
 *
 * What these cover that unit tests cannot:
 *   - the auth boundary (anonymous / owner / other signed-in user)
 *   - row-level security actually filtering at the database level
 *   - aiChat persisting both turns (mock provider when no API key)
 *
 * Skipped automatically when DATABASE_URL is not set, so `npm test` stays green
 * without Docker. Run against a migrated DB:
 *
 *   npm run db:up && npm run db:migrate && npm run db:rls && npm test
 */

import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';

import { createApp } from './app';
import type { HonoDataClient } from './data-client';
import { ownerDb } from './db/owner-client';
import { asUser } from './db/scope';
import { chats, flashcardDecks, partnerships, spaces, users } from './db/schema';
import { createPostgresDataClient } from './postgres-data';

/**
 * Skip when there is no reachable database, so `npm test` stays green on a
 * machine without Docker. A connection attempt is cheaper than a red suite that
 * people learn to ignore.
 */
async function databaseIsReachable(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  const postgres = (await import('postgres')).default;
  const probe = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 2 });
  try {
    await probe`select 1`;
    return true;
  } catch {
    return false;
  } finally {
    await probe.end({ timeout: 1 }).catch(() => {});
  }
}

const suite = (await databaseIsReachable()) ? describe : describe.skip;

const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const emailA = `a-${stamp}@curio.test`;
const emailB = `b-${stamp}@curio.test`;
const password = 'integration-password-123';

const { app } = createApp({
  clientFactory: (userId: string | null): HonoDataClient => createPostgresDataClient(userId),
});

const createdUserIds: string[] = [];

function cookieFrom(res: Response): string {
  const raw = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  return raw.map((c) => c.split(';')[0]).join('; ');
}

async function signUp(email: string): Promise<{ cookie: string; userId: string }> {
  const res = await app.request('/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, name: email.split('@')[0] }),
  });
  expect(res.status).toBe(200);
  const body = (await res.json()) as { user?: { id?: string } };
  const userId = body.user?.id;
  expect(userId).toBeTruthy();
  createdUserIds.push(userId!);
  return { cookie: cookieFrom(res), userId: userId! };
}

const as = (cookie: string) => ({
  'content-type': 'application/json',
  cookie,
});

suite('chat slice over HTTP (real Postgres + RLS)', () => {
  // Declared in beforeAll so a failure in setup reports clearly.
  let userA: { cookie: string; userId: string };
  let userB: { cookie: string; userId: string };
  const chatUuid = crypto.randomUUID();
  const spaceUuid = crypto.randomUUID();

  it('signs up two separate users', async () => {
    userA = await signUp(emailA);
    userB = await signUp(emailB);
    expect(userA.userId).not.toBe(userB.userId);
  });

  it('seeds a chat for user A only', async () => {
    await asUser(userA.userId, async (db) => {
      await db.insert(spaces).values({ spaceUuid, userUuid: userA.userId, name: 'Integration' });
      await db.insert(chats).values({ chatUuid, userUuid: userA.userId, spaceUuid, name: 'test chat' });
    });
  });

  it('rejects anonymous reads', async () => {
    const res = await app.request(`/messages?chat=${chatUuid}`);
    expect(res.status).toBe(401);
  });

  it('lets the owner read and write', async () => {
    const empty = await app.request(`/messages?chat=${chatUuid}`, { headers: as(userA.cookie) });
    expect(empty.status).toBe(200);
    expect(((await empty.json()) as { messages: unknown[] }).messages).toHaveLength(0);

    const write = await app.request('/messages', {
      method: 'POST',
      headers: as(userA.cookie),
      body: JSON.stringify({ chatUuid, role: 'user', content: 'hello from A' }),
    });
    expect(write.status).toBe(200);

    const after = await app.request(`/messages?chat=${chatUuid}`, { headers: as(userA.cookie) });
    expect(((await after.json()) as { messages: unknown[] }).messages).toHaveLength(1);
  });

  it('hides the chat from another signed-in user (app layer)', async () => {
    for (const path of [`/messages?chat=${chatUuid}`]) {
      const res = await app.request(path, { headers: as(userB.cookie) });
      expect(res.status).toBe(404);
    }

    const post = await app.request('/messages', {
      method: 'POST',
      headers: as(userB.cookie),
      body: JSON.stringify({ chatUuid, role: 'user', content: 'should not land' }),
    });
    expect(post.status).toBe(404);

    const aiChat = await app.request('/aiChat', {
      method: 'POST',
      headers: as(userB.cookie),
      body: JSON.stringify({ chatUuid, message: 'should not land' }),
    });
    expect(aiChat.status).toBe(404);

    const move = await app.request('/moveChat', {
      method: 'POST',
      headers: as(userB.cookie),
      body: JSON.stringify({ chatUuid, spaceUuid }),
    });
    expect(move.status).toBe(404);
  });

  it('refuses to create a document for someone else\'s object key', async () => {
    const foreignKey = `student-documents/${userB.userId}/stolen/file.pdf`;
    const res = await app.request('/documents', {
      method: 'POST',
      headers: as(userA.cookie),
      body: JSON.stringify({ originalKey: foreignKey, fileName: 'x.pdf', type: 'pdf' }),
    });
    expect(res.status).toBe(404);

    const own = await app.request('/documents', {
      method: 'POST',
      headers: as(userA.cookie),
      body: JSON.stringify({
        originalKey: `student-documents/${userA.userId}/own/file.pdf`,
        fileName: 'own.pdf',
        type: 'pdf',
      }),
    });
    expect(own.status).toBe(200);
  });

  it('enforces isolation in Postgres itself (RLS, not just the route)', async () => {
    const seenByB = await asUser(userB.userId, (db) => db.select().from(chats));
    expect(seenByB.find((c) => c.chatUuid === chatUuid)).toBeUndefined();

    const seenByA = await asUser(userA.userId, (db) => db.select().from(chats));
    expect(seenByA.find((c) => c.chatUuid === chatUuid)).toBeTruthy();
  });

  it('aiChat persists both turns', async () => {
    const res = await app.request('/aiChat', {
      method: 'POST',
      headers: as(userA.cookie),
      body: JSON.stringify({ chatUuid, message: 'what is photosynthesis' }),
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      success: boolean;
      messages: Array<{ role: string }>;
      mock: boolean;
    };
    expect(body.success).toBe(true);
    expect(body.messages.map((m) => m.role)).toEqual(['user', 'assistant']);

    const all = await app.request(`/messages?chat=${chatUuid}`, { headers: as(userA.cookie) });
    expect(((await all.json()) as { messages: unknown[] }).messages).toHaveLength(3);
  });

  it('does not serve the models behind dropped features', async () => {
    // Practice tests / learning profile / SAT prep are out of scope
    // (docs/decisions.md). The rows still exist; the bridge must not expose them.
    const excluded = ['SATMiniExamLog', 'ExtractedQuestion', 'ExamPaper', 'MockExam'];
    for (const model of excluded) {
      const res = await app.request('/db', {
        method: 'POST',
        headers: as(userA.cookie),
        body: JSON.stringify({ model, method: 'list' }),
      });
      const body = (await res.json()) as { data: unknown };
      expect(body.data, model).toEqual([]);
    }
  });

  it('serves a kept user-owned model through the bridge, RLS intact', async () => {
    const deckUuid = crypto.randomUUID();
    const partnershipUuid = crypto.randomUUID();

    await asUser(userA.userId, async (db) => {
      await db.insert(flashcardDecks).values({
        flashcardDeckUuid: deckUuid,
        userUuid: userA.userId,
        title: 'integration deck',
      });
    });
    // Public-read configuration: readable by everyone, writable by nobody.
    await ownerDb.insert(partnerships).values({
      partnershipUuid,
      partnerName: 'Integration Partner',
      partnerCode: `code-${stamp}`,
    });

    const bridge = (cookie: string, model: string, method: string, args?: object) =>
      app.request('/db', {
        method: 'POST',
        headers: as(cookie),
        body: JSON.stringify({ model, method, args }),
      });

    const own = (await (await bridge(userA.cookie, 'FlashcardDeck', 'list')).json()) as {
      data: Array<{ flashcardDeckUuid: string }>;
    };
    expect(own.data.map((r) => r.flashcardDeckUuid)).toContain(deckUuid);

    const other = (await (await bridge(userB.cookie, 'FlashcardDeck', 'list')).json()) as {
      data: unknown[];
    };
    expect(other.data).toHaveLength(0);

    for (const cookie of [userA.cookie, userB.cookie]) {
      const seen = (await (await bridge(cookie, 'Partnership', 'list')).json()) as {
        data: Array<{ partnershipUuid: string }>;
      };
      expect(seen.data.map((r) => r.partnershipUuid)).toContain(partnershipUuid);
    }

    const attempted = (await (
      await bridge(userA.cookie, 'Partnership', 'update', {
        partnershipUuid,
        partnerName: 'defaced',
      })
    ).json()) as { data?: unknown };
    expect(attempted.data ?? null).toBeNull();

    const [row] = await ownerDb
      .select()
      .from(partnerships)
      .where(eq(partnerships.partnershipUuid, partnershipUuid));
    expect(row.partnerName).toBe('Integration Partner');

    await ownerDb.delete(partnerships).where(eq(partnerships.partnershipUuid, partnershipUuid));
  });

  afterAll(async () => {
    // Owner connection: bypasses RLS, and cascades to chats/spaces/messages.
    for (const id of createdUserIds) {
      await ownerDb.delete(users).where(eq(users.id, id));
    }
  });
});
