/**
 * RAG endpoints over Qdrant.
 *
 *   GET  /rag/search?q=<text>&chat=<uuid>&limit=5
 *   POST /rag/reindex  { chatUuid }
 *
 * Vectors are filtered by `userUuid`, mirroring the database's RLS scope.
 * Without an embedding key these return 503 rather than pretending to work.
 */

import type { Context } from 'hono';

import { embed, hasAiKey } from '../ai';
import { ensureCollection, search, upsert } from '../qdrant';
import type { HonoEnv } from '../types';

type Identity = { sub: string } | null;

export interface RagRoutes {
  search: (c: Context<HonoEnv>) => Promise<Response>;
  reindex: (c: Context<HonoEnv>) => Promise<Response>;
}

export function createRagRoutes(): RagRoutes {
  const searchHandler = async (c: Context<HonoEnv>): Promise<Response> => {
    const identity = c.var.identity as Identity;
    if (!identity) return c.json({ success: false, error: 'Not signed in' }, 401);
    if (!hasAiKey()) {
      return c.json(
        { success: false, error: 'OPENAI_API_KEY not set — retrieval unavailable' },
        503,
      );
    }

    const q = c.req.query('q')?.trim();
    if (!q) return c.json({ success: false, error: 'q is required' }, 400);

    const chatUuid = c.req.query('chat') ?? undefined;
    const limit = Math.min(20, Number(c.req.query('limit') ?? 5) || 5);

    try {
      await ensureCollection();
      const vector = await embed(q);
      const hits = await search(vector, { userUuid: identity.sub, chatUuid, limit });
      return c.json({ success: true, hits });
    } catch (err) {
      return c.json({ success: false, error: (err as Error).message }, 502);
    }
  };

  const reindexHandler = async (c: Context<HonoEnv>): Promise<Response> => {
    const identity = c.var.identity as Identity;
    if (!identity) return c.json({ success: false, error: 'Not signed in' }, 401);
    if (!hasAiKey()) {
      return c.json(
        { success: false, error: 'OPENAI_API_KEY not set — cannot embed' },
        503,
      );
    }

    const body = (await c.req.json().catch(() => ({}))) as { chatUuid?: string };
    if (!body.chatUuid) return c.json({ success: false, error: 'chatUuid is required' }, 400);

    const chatRow = await c.var.db.models.Chat.get({ chatUuid: body.chatUuid });
    if (!chatRow.data || chatRow.data.userUuid !== identity.sub) {
      return c.json({ success: false, error: 'Chat not found' }, 404);
    }

    const messages = await c.var.db.models.Message.listByChat(
      { chatUuid: body.chatUuid },
      { limit: 500 },
    );

    try {
      const points = await Promise.all(
        (messages.data ?? []).map(async (m) => ({
          id: m.messageUuid,
          vector: await embed(m.content),
          payload: {
            userUuid: identity.sub,
            chatUuid: body.chatUuid!,
            messageUuid: m.messageUuid,
            role: m.role,
            text: m.content,
          },
        })),
      );
      await upsert(points);
      return c.json({ success: true, indexed: points.length });
    } catch (err) {
      return c.json({ success: false, error: (err as Error).message }, 502);
    }
  };

  return { search: searchHandler, reindex: reindexHandler };
}
