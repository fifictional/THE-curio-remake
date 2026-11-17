/**
 * RAG endpoints over Qdrant.
 *
 *   GET  /rag/search?q=<text>&chat=<uuid>&limit=5      message vectors
 *   POST /rag/reindex  { chatUuid }                    re-embed a chat
 *   POST /rag/reindex  { documentUuid }                (re)index one document
 *   POST /rag/reindex  { all: true, limit? }           backfill the caller's documents
 *
 * Every vector is filtered by `userUuid`, mirroring the database's RLS scope.
 * Embeddings work without a key (deterministic pseudo-vector) so the wire
 * format is testable offline; *semantic* quality needs OPENAI_API_KEY.
 */

import type { Context } from 'hono';

import { embed, hasAiKey } from '../ai';
import { and, eq, isNotNull } from 'drizzle-orm';

import { ownerDb } from '../db/owner-client';
import { documents } from '../db/schema';
import { indexDocumentText } from '../document-index';
import { ensureCollection, search, upsert } from '../qdrant';
import { extractText } from './documents';
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
    if (!hasAiKey() && process.env.RAG_OFFLINE !== '1') {
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

  /** Index one document the caller owns; returns the chunk count. */
  const indexDocument = async (
    userId: string,
    documentUuid: string,
  ): Promise<number | null> => {
    const [row] = await ownerDb
      .select()
      .from(documents)
      .where(and(eq(documents.documentUuid, documentUuid), eq(documents.userUuid, userId)))
      .limit(1);

    if (!row) return null;

    const text = await extractText(row.key);
    if (!text) return 0;

    return indexDocumentText({
      userUuid: userId,
      documentUuid: row.documentUuid,
      documentName: row.fileName || 'Document',
      text,
    });
  };

  const reindexHandler = async (c: Context<HonoEnv>): Promise<Response> => {
    const identity = c.var.identity as Identity;
    if (!identity) return c.json({ success: false, error: 'Not signed in' }, 401);

    const body = (await c.req.json().catch(() => ({}))) as {
      chatUuid?: string;
      documentUuid?: string;
      all?: boolean;
      limit?: number;
    };

    // Documents: one, or a backfill of the caller's library.
    if (body.documentUuid || body.all) {
      try {
        if (body.documentUuid) {
          const chunks = await indexDocument(identity.sub, body.documentUuid);
          if (chunks === null) return c.json({ success: false, error: 'Document not found' }, 404);
          return c.json({ success: true, documents: 1, indexed: chunks });
        }

        const limit = Math.min(200, Number(body.limit ?? 50) || 50);
        const rows = await ownerDb
          .select({ documentUuid: documents.documentUuid })
          .from(documents)
          .where(and(eq(documents.userUuid, identity.sub), isNotNull(documents.key)))
          .limit(limit);

        let indexed = 0;
        let withText = 0;
        for (const row of rows) {
          const chunks = await indexDocument(identity.sub, row.documentUuid);
          if (chunks) {
            indexed += chunks;
            withText += 1;
          }
        }

        return c.json({ success: true, documents: rows.length, withText, indexed });
      } catch (err) {
        return c.json({ success: false, error: (err as Error).message }, 502);
      }
    }

    if (!body.chatUuid) {
      return c.json(
        { success: false, error: 'chatUuid, documentUuid or all is required' },
        400,
      );
    }

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
