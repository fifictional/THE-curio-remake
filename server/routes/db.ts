/**
 * `/db` — the bridge.
 *
 * A generic data endpoint that lets the ORIGINAL Curio frontend run unchanged
 * against the new stack. The old UI calls
 * `client.models.Message.listMessageByChatUuidAndCreatedAt({ chatUuid })`,
 * which used to be a GraphQL request to AppSync. The shim in `ui/src/lib/`
 * forwards that call here as `{ model, method, args, options }` and this module
 * answers it from Postgres.
 *
 * Everything still runs inside `asUser(...)`, so RLS decides what is visible —
 * the bridge does not grant anyone extra reach.
 *
 * Deliberately generic and small: a registry of the tables v0 knows about.
 * Unknown models return empty data instead of throwing, so unmigrated screens
 * render an empty state rather than crashing the app.
 */

import { and, asc, desc, eq, getTableColumns, sql, type SQL } from 'drizzle-orm';
import type { Context } from 'hono';

import { asUser } from '../db/scope';
import {
  appSettings,
  chatCitations,
  batchProcesses,
  bundles,
  chats,
  curioSubscriptions,
  datalabRequests,
  documentSections,
  documentSummaries,
  documents,
  examModules,
  flashcardDecks,
  flashcards,
  futureUsers,
  messages,
  metadata,
  mockDocuments,
  partnerships,
  purchases,
  questions,
  quizAttempts,
  quizQuestions,
  quizzes,
  receipts,
  spaceUsers,
  spaces,
  tasks,
  userActionLogs,
  userRequests,
  users,
} from '../db/schema';
import type { HonoEnv } from '../types';

interface ModelDef {
  table: Record<string, unknown>;
  pk: string;
  /** Columns that are timestamps — used to pick a default sort. */
  timestamps?: string[];
}

/**
 * Tiny read cache.
 *
 * The legacy UI issues the same list/get several times per render (19-29 calls
 * for one page). A very short TTL collapses the duplicates without serving
 * stale data to the user: writes on a model clear that model's keys.
 */
const READ_TTL_MS = Number(process.env.DB_CACHE_TTL_MS ?? 2000);
const readCache = new Map<string, { at: number; value: unknown }>();

function cacheKey(userId: string, body: DbRequest): string {
  return `${userId}|${body.model}|${body.method}|${JSON.stringify(body.args ?? {})}|${JSON.stringify(body.options ?? {})}`;
}

function cacheGet(key: string): unknown | undefined {
  const hit = readCache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > READ_TTL_MS) {
    readCache.delete(key);
    return undefined;
  }
  return hit.value;
}

function cacheSet(key: string, value: unknown): void {
  if (readCache.size > 500) readCache.clear();
  readCache.set(key, { at: Date.now(), value });
}

function cacheInvalidateModel(model: string): void {
  for (const key of readCache.keys()) {
    if (key.includes(`|${model}|`)) readCache.delete(key);
  }
}

const REGISTRY: Record<string, ModelDef> = {
  Chat: { table: chats as never, pk: 'chatUuid', timestamps: ['createdAt'] },
  Message: { table: messages as never, pk: 'messageUuid', timestamps: ['createdAt'] },
  Space: { table: spaces as never, pk: 'spaceUuid', timestamps: ['updatedAt'] },
  Document: { table: documents as never, pk: 'documentUuid', timestamps: ['createdAt'] },
  Flashcard: { table: flashcards as never, pk: 'flashcardUuid', timestamps: ['createdAt'] },
  Question: { table: questions as never, pk: 'questionUuid', timestamps: ['createdAt'] },
  /** The old UI's identity model. */
  UserProfile: { table: users as never, pk: 'id' },

  SpaceUsers: { table: spaceUsers as never, pk: 'spaceUsersUuid' },
  Task: { table: tasks as never, pk: 'taskUuid', timestamps: ['createdAt'] },
  UserRequest: { table: userRequests as never, pk: 'id', timestamps: ['createdAt'] },
  UserActionLog: {
    table: userActionLogs as never,
    pk: 'userActionLogUuid',
    timestamps: ['createdAt'],
  },
  Metadata: { table: metadata as never, pk: 'metadataUuid' },
  Quiz: { table: quizzes as never, pk: 'quizUuid', timestamps: ['createdAt'] },
  QuizQuestion: { table: quizQuestions as never, pk: 'quizQuestionUuid' },
  QuizAttempt: { table: quizAttempts as never, pk: 'quizAttemptUuid' },
  DocumentSummary: {
    table: documentSummaries as never,
    pk: 'documentSummaryUuid',
  },
  FlashcardDeck: { table: flashcardDecks as never, pk: 'flashcardDeckUuid' },

  /*
   * The models that only became tables later. `FutureUser` and `BatchProcess`
   * are deliberately absent: rls.ts denies the app access to both (PII and
   * internal job state have no role model yet), so they keep the "unknown model"
   * behaviour — an empty result — instead of a half-working screen.
   */
  DocumentSection: {
    table: documentSections as never,
    pk: 'documentSectionUuid',
    timestamps: ['createdAt'],
  },
  MockDocument: { table: mockDocuments as never, pk: 'mockDocumentUuid' },
  DatalabRequest: {
    table: datalabRequests as never,
    pk: 'requestId',
    timestamps: ['createdAt'],
  },
  Partnership: { table: partnerships as never, pk: 'partnershipUuid' },
  /** Sources shown in the chat's Sources tab (written by /aiChat). */
  ChatCitation: {
    table: chatCitations as never,
    pk: 'chatCitationUuid',
    timestamps: ['createdAt'],
  },
  /** 21 rows in dev: nothing stopped the old UI creating one per session. */
  AppSettings: { table: appSettings as never, pk: 'appSettingsUuid', timestamps: ['updatedAt'] },
};

/** Number of models the bridge serves, used by /db/health. */
export const modelCount = Object.keys(REGISTRY).length;

interface DbRequest {
  model: string;
  method: string;
  args?: Record<string, unknown>;
  options?: { limit?: number; nextToken?: string | null; sortDirection?: 'ASC' | 'DESC' };
}

/** `listMessageByChatUuidAndCreatedAt` → { filter: chatUuid, sort: createdAt } */
function parseGeneratedName(method: string): { filterField?: string; sortField?: string } {
  const m = /^list[A-Z]\w*?By([A-Z]\w*?)(?:And([A-Z]\w*))?$/.exec(method);
  if (!m) return {};
  const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
  return { filterField: lower(m[1]), sortField: m[2] ? lower(m[2]) : undefined };
}

/** Strip Amplify-only options and pull the real filter values out of `args`. */
function buildWhere(
  table: Record<string, unknown>,
  args: Record<string, unknown> | undefined,
): SQL | undefined {
  if (!args) return undefined;
  const conditions: SQL[] = [];
  for (const [key, value] of Object.entries(args)) {
    if (value === undefined || value === null) continue;
    const column = (table as Record<string, unknown>)[key];
    if (!column) continue;
    conditions.push(eq(column as never, value as never));
  }
  return conditions.length ? and(...conditions) : undefined;
}

export async function handleDbRequest(c: Context<HonoEnv>): Promise<Response> {
  const body = (await c.req.json().catch(() => null)) as DbRequest | null;
  if (!body || typeof body.model !== 'string' || typeof body.method !== 'string') {
    return c.json({ data: null, errors: [{ message: 'model and method are required' }] }, 400);
  }

  const identity = c.var.identity as { sub: string } | null;
  if (!identity) {
    // Several hooks run before the session resolves and do `response.data.length`
    // without checking the status. Answer with the shape they expect.
    return c.json({ data: emptyForMethod(body.method) }, 401);
  }

  const def = REGISTRY[body.model];
  if (!def) {
    /*
     * Unknown model: an empty result of the right shape keeps old screens
     * rendering instead of throwing on `.data.length`. That is how the two
     * owner-only tables (`FutureUser`, `BatchProcess`) behave until there is a
     * role model — see rls.ts.
     */
    return c.json({ data: emptyForMethod(body.method) });
  }

  const table = def.table as Record<string, unknown>;
  // The old UI sends AppSync-only fields (titleChangedByTheUser,
  // hasFlashcardsOrQuizzes, …). Postgres rejects unknown columns, so writes are
  // restricted to the columns this table actually has.
  const columnMap = getTableColumns(table as never) as Record<
    string,
    { dataType?: string }
  >;
  const onlyColumns = (value: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key in columnMap)
        // The UI sends ISO strings (AppSync's datetime); Drizzle expects Date.
        .map(([key, raw]) => {
          const isDate = columnMap[key]?.dataType === 'date';
          if (isDate && typeof raw === 'string') {
            const parsed = new Date(raw);
            return [key, Number.isNaN(parsed.getTime()) ? null : parsed];
          }
          return [key, raw];
        }),
    );
  const args = body.args ?? {};
  const limit = Math.min(Number(body.options?.limit ?? 500) || 500, 1000);
  const direction = body.options?.sortDirection === 'ASC' ? asc : desc;

  const isRead = body.method === 'get' || body.method.startsWith('list');
  const key = cacheKey(identity.sub, body);
  if (isRead) {
    const cached = cacheGet(key);
    if (cached !== undefined) return c.json({ data: cached });
  }

  return asUser(identity.sub, async (db) => {
    // Generic dispatcher: the table and the shape are decided at runtime, so
    // Drizzle's per-table types cannot apply here. The RLS scope still does.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = db as any;

    const run = async (): Promise<unknown> => {
      if (body.method === 'get') {
        const where = buildWhere(table, args);
        const rows = (await q.select().from(table).where(where).limit(1)) as unknown[];
        return rows[0] ?? null;
      }

      if (body.method === 'create') {
        const values: Record<string, unknown> = onlyColumns(args);
        if (!values[def.pk]) values[def.pk] = crypto.randomUUID();
        const rows = (await q.insert(table).values(values).returning()) as unknown[];
        return rows[0];
      }

      if (body.method === 'update') {
        const { [def.pk]: pkValue, ...rawRest } = args;
        const rest = onlyColumns(rawRest);
        const where = eq(table[def.pk] as never, pkValue as never);
        const rows = (await q
          .update(table)
          .set({ ...rest, updatedAt: new Date() })
          .where(where)
          .returning()) as unknown[];
        return rows[0];
      }

      if (body.method === 'delete') {
        const { [def.pk]: pkValue, ...rest } = args;
        const where = buildWhere(table, { [def.pk]: pkValue, ...rest })!;
        await q.delete(table).where(where);
        return { [def.pk]: pkValue };
      }

      // list / listXByY
      const generated = parseGeneratedName(body.method);
      const filter: Record<string, unknown> = { ...args };
      if (generated.filterField && args[generated.filterField] === undefined) {
        // callers pass the value positionally as args.<filterField>, so nothing
        // extra to do — kept explicit for readability.
      }
      const where = buildWhere(table, filter);
      const sortKey = generated.sortField ?? def.timestamps?.[0] ?? def.pk;
      const sortColumn = table[sortKey] ?? table[def.pk];

      const base = q.select().from(table);
      const withWhere = where ? base.where(where) : base.where(sql`true`);
      return withWhere.orderBy(direction(sortColumn as never)).limit(limit);
    };

    try {
      const data = await run();
      if (isRead) cacheSet(key, data);
      else cacheInvalidateModel(body.model);

      /*
       * v0 stub: the old UI's `UserProfile` has onboarding flags and a
       * `userUuid` that the identity table does not (it has `id`). Without these
       * the shell bounces between /signin and /welcome forever, because
       * `!userProfile.onboardingCompleted` is always true.
       */
      if (body.model === 'UserProfile') {
        const shape = (row: Record<string, unknown> | undefined) =>
          row
            ? {
                ...row,
                userUuid: row.id,
                onboardingCompleted: true,
                onboardingSkipped: true,
                memoryDisabled: false,
              }
            : null;
        // The identity table has no RLS (Better Auth writes it before a user
        // context exists), so the bridge restricts it to the caller here.
        const shaped = Array.isArray(data)
          ? data
              .map((r) => shape(r as Record<string, unknown>))
              .filter((r) => r && (r as Record<string, unknown>).id === identity.sub)
          : shape(data as Record<string, unknown> | undefined);
        return c.json({ data: shaped });
      }
      const shaped = Array.isArray(data) ? data : data;
      return c.json({ data: shaped });
    } catch (err) {
      return c.json({ data: null, errors: [{ message: (err as Error).message }] }, 200);
    }
  });
}

function emptyForMethod(method: string): unknown {
  if (method.startsWith('list')) return [];
  return null;
}
