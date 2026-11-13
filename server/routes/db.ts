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

import { and, asc, desc, eq, sql, type SQL } from 'drizzle-orm';
import type { Context } from 'hono';

import { asUser } from '../db/scope';
import {
  chats,
  documents,
  flashcards,
  messages,
  questions,
  spaces,
  users,
} from '../db/schema';
import type { HonoEnv } from '../types';

interface ModelDef {
  table: Record<string, unknown>;
  pk: string;
  /** Columns that are timestamps — used to pick a default sort. */
  timestamps?: string[];
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
};

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
  const identity = c.var.identity as { sub: string } | null;
  if (!identity) return c.json({ data: null, errors: [{ message: 'Not signed in' }] }, 401);

  const body = (await c.req.json().catch(() => null)) as DbRequest | null;
  if (!body || typeof body.model !== 'string' || typeof body.method !== 'string') {
    return c.json({ data: null, errors: [{ message: 'model and method are required' }] }, 400);
  }

  const def = REGISTRY[body.model];
  if (!def) {
    // Unmigrated model: an empty result keeps old screens rendering.
    return c.json({ data: emptyForMethod(body.method), errors: [] });
  }

  const table = def.table as Record<string, unknown>;
  const args = body.args ?? {};
  const limit = Math.min(Number(body.options?.limit ?? 500) || 500, 1000);
  const direction = body.options?.sortDirection === 'ASC' ? asc : desc;

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
        const values: Record<string, unknown> = { ...args };
        if (!values[def.pk]) values[def.pk] = crypto.randomUUID();
        const rows = (await q.insert(table).values(values).returning()) as unknown[];
        return rows[0];
      }

      if (body.method === 'update') {
        const { [def.pk]: pkValue, ...rest } = args;
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
      const shaped = Array.isArray(data) ? data : data;
      return c.json({ data: shaped, errors: [] });
    } catch (err) {
      return c.json({ data: null, errors: [{ message: (err as Error).message }] }, 200);
    }
  });
}

function emptyForMethod(method: string): unknown {
  if (method.startsWith('list')) return [];
  return null;
}
