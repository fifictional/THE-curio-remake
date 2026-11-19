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

import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { count as sqlCount, eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';

import { createApp } from './app';
import type { HonoDataClient } from './data-client';
import { ownerDb } from './db/owner-client';
import { asUser } from './db/scope';
import {
  chatCitations,
  chats,
  documents,
  flashcardDecks,
  messages,
  partnerships,
  spaces,
  users,
} from './db/schema';
import { indexDocumentText, searchDocumentText } from './document-index';
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

// The suite makes more auth calls than a human would; the limiter has its own
// unit tests, so keep it out of the way here.
process.env.RATE_LIMIT_DISABLED = '1';

const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const emailA = `a-${stamp}@curio.test`;
const emailB = `b-${stamp}@curio.test`;
const password = 'integration-password-123';

/**
 * Retrieval is injected: the citation path must be provable without an OpenAI
 * key or a Qdrant collection, and the shape is what the test is about.
 */
const retrievedChunks = [
  {
    score: 0.91,
    documentUuid: '99999999-9999-4999-8999-999999999999',
    documentName: 'Cell Biology Notes',
    chunkIndex: 0,
    text: 'Mitochondria produce ATP through oxidative phosphorylation.',
  },
  {
    score: 0.74,
    documentUuid: '99999999-9999-4999-8999-999999999999',
    documentName: 'Cell Biology Notes',
    chunkIndex: 3,
    text: 'Chloroplasts carry out photosynthesis in plant cells.',
  },
];

const { app } = createApp({
  clientFactory: (userId: string | null): HonoDataClient => createPostgresDataClient(userId),
  aiChat: { retrieve: async () => retrievedChunks },
  // Generation is a model call; the persistence around it is what this covers.
  generate: async ({ kind, count }) =>
    kind === 'flashcards'
      ? {
          cards: Array.from({ length: count }, (_, i) => ({
            title: `Card ${i + 1}`,
            content: `Answer ${i + 1}`,
          })),
        }
      : {
          questions: [
            {
              question: 'What does the cell make?',
              options: ['ATP', 'DNA', 'Sugar', 'Light'],
              answer: 0,
              explanations: ['Mitochondria produce ATP.'],
            },
          ],
        },
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

  it('records the documents that grounded an answer, scoped to the chat', async () => {
    // Own chat, so the message-count assertion elsewhere is unaffected.
    const citationChatUuid = crypto.randomUUID();
    await asUser(userA.userId, (db) =>
      db.insert(chats).values({
        chatUuid: citationChatUuid,
        userUuid: userA.userId,
        name: 'citation chat',
      }),
    );

    const res = await app.request('/aiChat', {
      method: 'POST',
      headers: as(userA.cookie),
      body: JSON.stringify({ chatUuid: citationChatUuid, message: 'what do mitochondria do' }),
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      citations: Array<{ title: string; url: string }>;
      retrieved: number;
    };
    expect(body.retrieved).toBe(2);
    // Two chunks from one document → one citation, not two.
    expect(body.citations).toHaveLength(1);
    expect(body.citations[0].title).toBe('Cell Biology Notes');
    expect(body.citations[0].url).toBe('/documents/99999999-9999-4999-8999-999999999999');

    // The Sources tab reads them through the bridge, filtered by chat.
    const listed = await app.request('/db', {
      method: 'POST',
      headers: as(userA.cookie),
      body: JSON.stringify({
        model: 'ChatCitation',
        method: 'listChatCitationByChatUuidAndCreatedAt',
        args: { chatUuid: citationChatUuid },
      }),
    });
    const listedBody = (await listed.json()) as { data: Array<{ title: string }> };
    expect(listedBody.data.map((c) => c.title)).toContain('Cell Biology Notes');

    // Another signed-in user cannot read this chat's citations.
    const foreign = await app.request('/db', {
      method: 'POST',
      headers: as(userB.cookie),
      body: JSON.stringify({
        model: 'ChatCitation',
        method: 'listChatCitationByChatUuidAndCreatedAt',
        args: { chatUuid: citationChatUuid },
      }),
    });
    expect(((await foreign.json()) as { data: unknown[] }).data).toHaveLength(0);

    const [stored] = await asUser(userA.userId, (db) =>
      db.select().from(chatCitations).where(eq(chatCitations.chatUuid, citationChatUuid)),
    );
    expect(stored.type).toBe('document');
  });

  it('retrieves a document by keyword for its owner only (no API key needed)', async () => {
    const documentUuid = crypto.randomUUID();

    await asUser(userA.userId, (db) =>
      db.insert(documents).values({
        documentUuid,
        userUuid: userA.userId,
        key: `student-documents/${userA.userId}/kb/file.pdf`,
        fileName: 'Cell Biology Notes',
        type: 'pdf',
      }),
    );

    const chunks = await indexDocumentText({
      userUuid: userA.userId,
      documentUuid,
      documentName: 'Cell Biology Notes',
      text:
        'Mitochondria produce ATP through oxidative phosphorylation. ' +
        'Chloroplasts carry out photosynthesis in plant cells.',
    });
    expect(chunks).toBeGreaterThan(0);

    const own = await searchDocumentText({
      userUuid: userA.userId,
      query: 'oxidative phosphorylation',
      limit: 3,
    });
    expect(own.map((hit) => hit.documentUuid)).toContain(documentUuid);

    // Keyword search is explicit about the user: the connection bypasses RLS.
    const foreign = await searchDocumentText({
      userUuid: userB.userId,
      query: 'oxidative phosphorylation',
      limit: 3,
    });
    expect(foreign).toHaveLength(0);

    // A question-shaped query still matches (the OR fallback).
    const question = await searchDocumentText({
      userUuid: userA.userId,
      query: 'what do mitochondria do in a cell',
      limit: 3,
    });
    expect(question.map((hit) => hit.documentUuid)).toContain(documentUuid);
  });

  it('resets a password through the mailer seam', async () => {
    const logFile = join(tmpdir(), `curio-reset-${stamp}.log`);
    process.env.RESET_LINKS_FILE = logFile;

    try {
      const request = await app.request('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: emailA, redirectTo: '/reset' }),
      });
      expect(request.status).toBe(200);

      const logged = await readFile(logFile, 'utf8');
      const token = /token=(\S+)/.exec(logged)?.[1];
      expect(token, 'the reset link must be written somewhere').toBeTruthy();

      const reset = await app.request('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ newPassword: 'reset-password-123', token }),
      });
      expect(reset.status).toBe(200);

      const signIn = await app.request('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: emailA, password: 'reset-password-123' }),
      });
      expect(signIn.status).toBe(200);

      // The old password no longer works.
      const old = await app.request('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: emailA, password }),
      });
      expect(old.status).toBe(401);
    } finally {
      delete process.env.RESET_LINKS_FILE;
      await rm(logFile, { force: true });
    }
  });

  it('generates flashcards and a gradable quiz from a chat', async () => {
    const cards = await app.request('/api/ai/generate', {
      method: 'POST',
      headers: as(userA.cookie),
      body: JSON.stringify({ kind: 'flashcards', chatUuid, count: 3 }),
    });
    expect(cards.status).toBe(200);
    const cardsBody = (await cards.json()) as {
      created: number;
      flashcards: Array<{ title: string; chatUuid: string }>;
    };
    expect(cardsBody.created).toBe(3);
    expect(cardsBody.flashcards[0].chatUuid).toBe(chatUuid);

    const quiz = await app.request('/api/ai/generate', {
      method: 'POST',
      headers: as(userA.cookie),
      body: JSON.stringify({ kind: 'quiz', chatUuid, count: 3 }),
    });
    expect(quiz.status).toBe(200);
    const quizBody = (await quiz.json()) as {
      quiz: { quizUuid: string; questionCount: number };
      questions: Array<{ answer: number | null; options: string[] }>;
    };
    expect(quizBody.quiz.questionCount).toBe(1);
    // The old model never stored the correct index; a quiz without it cannot be graded.
    expect(quizBody.questions[0].answer).toBe(0);

    // Another user cannot ask for it: the chat is not theirs.
    const foreign = await app.request('/api/ai/generate', {
      method: 'POST',
      headers: as(userB.cookie),
      body: JSON.stringify({ kind: 'flashcards', chatUuid }),
    });
    expect(foreign.status).toBe(400);
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

  it('defaults bridge creates to the caller, and reports bad ids as 400', async () => {
    // A new client has no reason to know its own `user_uuid` column; omitting it
    // used to violate the RLS `with check` and fail as a 500.
    const created = await app.request('/db', {
      method: 'POST',
      headers: as(userA.cookie),
      body: JSON.stringify({ model: 'Chat', method: 'create', args: { name: 'no owner passed' } }),
    });
    const createdBody = (await created.json()) as {
      data: { chatUuid: string; userUuid: string } | null;
    };
    expect(created.status).toBe(200);
    expect(createdBody.data?.userUuid).toBe(userA.userId);

    // A malformed identifier must not abort the request transaction: that made
    // every caught error escape as a 500 from the global error handler.
    const bad = await app.request('/db', {
      method: 'POST',
      headers: as(userA.cookie),
      body: JSON.stringify({ model: 'Chat', method: 'get', args: { chatUuid: 'abc' } }),
    });
    expect(bad.status).toBe(400);
    expect(((await bad.json()) as { data: unknown }).data).toBeNull();
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

  it('exports and then deletes an account completely', async () => {
    // A throwaway user: deletion is the thing under test, not the shared fixture.
    const emailC = `c-${stamp}@curio.test`;
    const userC = await signUp(emailC);
    const chatC = crypto.randomUUID();

    await asUser(userC.userId, async (db) => {
      await db.insert(chats).values({ chatUuid: chatC, userUuid: userC.userId, name: 'export me' });
      await db.insert(messages).values({
        messageUuid: crypto.randomUUID(),
        chatUuid: chatC,
        role: 'user',
        content: 'exported message',
      });
      await db.insert(documents).values({
        documentUuid: crypto.randomUUID(),
        userUuid: userC.userId,
        key: `student-documents/${userC.userId}/export/file.pdf`,
        fileName: 'export.pdf',
        type: 'application/pdf',
      });
    });

    const exported = await app.request('/account/export', { headers: as(userC.cookie) });
    expect(exported.status).toBe(200);
    const dump = (await exported.json()) as {
      profile: { email: string };
      chats: Array<{ name: string }>;
      messages: Array<{ content: string }>;
      documents: Array<{ fileName: string }>;
    };
    expect(dump.profile.email).toBe(emailC);
    expect(dump.chats.map((c) => c.name)).toContain('export me');
    expect(dump.messages.map((m) => m.content)).toContain('exported message');
    expect(dump.documents.map((d) => d.fileName)).toContain('export.pdf');

    // A wrong confirmation must not delete anything.
    const wrong = await app.request('/account', {
      method: 'DELETE',
      headers: as(userC.cookie),
      body: JSON.stringify({ confirmEmail: 'someone-else@curio.test' }),
    });
    expect(wrong.status).toBe(400);

    const deleted = await app.request('/account', {
      method: 'DELETE',
      headers: as(userC.cookie),
      body: JSON.stringify({ confirmEmail: emailC }),
    });
    expect(deleted.status).toBe(200);

    // Session gone, rows gone.
    const after = await app.request('/me', { headers: as(userC.cookie) });
    expect(after.status).toBe(401);
    const [{ n }] = await ownerDb
      .select({ n: sqlCount() })
      .from(users)
      .where(eq(users.email, emailC));
    expect(Number(n)).toBe(0);
  });

  afterAll(async () => {
    // Owner connection: bypasses RLS, and cascades to chats/spaces/messages.
    for (const id of createdUserIds) {
      await ownerDb.delete(users).where(eq(users.id, id));
    }
  });
});
