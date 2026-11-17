/**
 * `POST /aiChat` — one user message in, one assistant message out, persisted.
 *
 * Replaces the old chain: client → AppSync → hono-heavy Lambda → its own
 * GraphQL client → AppSync → DynamoDB.
 *
 * Now: browser → Hono → RLS-scoped Postgres (+ best-effort Qdrant indexing).
 */

import type { Context, MiddlewareHandler } from 'hono';
import { z } from 'zod';

import { chat, embed, hasAiKey } from '../ai';
import { upsert, searchDocumentChunks, type DocumentChunkHit } from '../qdrant';
import { getValidatedBody, validateBody } from '../middleware/validate';
import type { HonoEnv } from '../types';

export const AiChatArgs = z.object({
  chatUuid: z.string().uuid(),
  message: z.string().min(1).max(8000),
  /** How many previous messages to send as context. */
  historyLimit: z.coerce.number().int().min(0).max(50).optional(),
});

export interface AiChatRoute {
  validate: MiddlewareHandler<HonoEnv>;
  handler: (c: Context<HonoEnv>) => Promise<Response>;
}

type Identity = { sub: string } | null;

/** How many document chunks to ground an answer on. */
const RAG_LIMIT = Number(process.env.RAG_LIMIT ?? 5);
/**
 * Minimum cosine similarity for a chunk to count as a source. 0.2 is a floor,
 * not a relevance judgement: text-embedding-3-small scores related paragraphs
 * well above it and unrelated ones well below.
 */
const RAG_MIN_SCORE = Number(process.env.RAG_MIN_SCORE ?? 0.2);

export interface AiChatDeps {
  /**
   * Retrieval seam. Default: embed the question and search the user's document
   * chunks in Qdrant (requires OPENAI_API_KEY). Injected in tests so citations
   * can be exercised without a provider.
   */
  retrieve?: (input: { userUuid: string; query: string }) => Promise<DocumentChunkHit[]>;
}

/** Numbered excerpts, with the document name so the model can attribute them. */
export function buildContext(chunks: DocumentChunkHit[]): string {
  const numbered = chunks.map(
    (chunk, i) => `[${i + 1}] "${chunk.documentName}"\n${chunk.text}`,
  );

  return [
    'The student\'s own documents are below. Use them when they are relevant,',
    'say which document you are relying on, and do not invent facts they do not contain.',
    'If they are not relevant, answer normally and ignore them.',
    '',
    numbered.join('\n\n'),
  ].join('\n');
}

/** One citation per document, best-scoring first. */
export function citationsFor(chunks: DocumentChunkHit[]): Array<{
  documentUuid: string;
  documentName: string;
}> {
  const best = new Map<string, DocumentChunkHit>();
  for (const chunk of chunks) {
    const seen = best.get(chunk.documentUuid);
    if (!seen || chunk.score > seen.score) best.set(chunk.documentUuid, chunk);
  }

  return [...best.values()]
    .sort((a, b) => b.score - a.score)
    .map((chunk) => ({ documentUuid: chunk.documentUuid, documentName: chunk.documentName }));
}

export function createAiChatRoute(deps: AiChatDeps = {}): AiChatRoute {
  const validate = validateBody(AiChatArgs);

  const handler = async (c: Context<HonoEnv>): Promise<Response> => {
    const identity = c.var.identity as Identity;
    if (!identity) return c.json({ success: false, error: 'Not signed in' }, 401);

    const client = c.var.db;
    const input = getValidatedBody<typeof AiChatArgs>(c);

    // Ownership: RLS also enforces this, but a missing chat should be a 404,
    // not an empty conversation.
    const chatRow = await client.models.Chat.get({ chatUuid: input.chatUuid });
    if (!chatRow.data || chatRow.data.userUuid !== identity.sub) {
      // Diagnostic: tells us whether the row is missing or simply invisible to
      // this user (RLS), and which chat the client actually asked for.
      console.warn(
        '[aiChat] chat not found',
        JSON.stringify({
          requested: input.chatUuid,
          found: Boolean(chatRow.data),
          owner: chatRow.data?.userUuid ?? null,
          caller: identity.sub,
        }),
      );
      return c.json({ success: false, error: 'Chat not found' }, 404);
    }

    // 1. persist the user message
    const userMessage = await client.models.Message.create({
      chatUuid: input.chatUuid,
      role: 'user',
      content: input.message,
    });

    // 2. retrieve the student's own documents for this question (best-effort:
    //    a Qdrant or provider failure must not fail the chat).
    const retrieve =
      deps.retrieve ??
      (async ({ userUuid, query }: { userUuid: string; query: string }) => {
        // Without a provider the vectors are deterministic noise, so retrieval
        // is off unless RAG_OFFLINE=1 (local wiring checks only — never in prod).
        if (!hasAiKey() && process.env.RAG_OFFLINE !== '1') return [];
        const vector = await embed(query);
        return searchDocumentChunks(vector, {
          userUuid,
          limit: RAG_LIMIT,
          minScore: RAG_MIN_SCORE,
        });
      });

    let chunks: DocumentChunkHit[] = [];
    try {
      chunks = await retrieve({ userUuid: identity.sub, query: input.message });
    } catch (err) {
      console.warn('[aiChat] retrieval skipped:', (err as Error).message);
    }

    // 3. build context from stored history (RLS keeps it to this user's rows)
    const history = await client.models.Message.listByChat(
      { chatUuid: input.chatUuid },
      { limit: input.historyLimit ?? 20 },
    );
    const turns: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = (
      history.data ?? []
    ).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
    if (chunks.length) {
      turns.unshift({ role: 'system', content: buildContext(chunks) });
    }

    // 4. ask the model
    const reply = await chat(turns);

    // 5. persist the assistant message
    const assistantMessage = await client.models.Message.create({
      chatUuid: input.chatUuid,
      role: 'assistant',
      content: reply,
    });

    /*
     * 6. record which documents grounded this answer. The legacy stack wrote
     *    web-search citations with character offsets; here the source is a
     *    document, so the URL is the document page and the offsets are 0 —
     *    we cannot know which characters a model leaned on, and inventing a
     *    span would make the UI highlight the wrong text.
     */
    const citations: Array<{ chatCitationUuid: string; title: string; url: string }> = [];
    for (const source of citationsFor(chunks)) {
      const created = await client.models.ChatCitation.create({
        chatUuid: input.chatUuid,
        messageUuid: assistantMessage.data!.messageUuid,
        type: 'document',
        title: source.documentName || 'Document',
        url: `/documents/${source.documentUuid}`,
        startIndex: 0,
        endIndex: 0,
      });
      if (created.data) {
        citations.push({
          chatCitationUuid: created.data.chatCitationUuid,
          title: created.data.title,
          url: created.data.url,
        });
      }
    }

    /*
     * 7. flag the chat: the UI only renders the Sources tab when the chat says
     *    it has citations (legacy semantics: `isWebSearchCalled`). Same field,
     *    now meaning "this conversation was grounded on sources".
     */
    if (citations.length) {
      await client.models.Chat.update({ chatUuid: input.chatUuid, isWebSearchCalled: true });
    }

    // 8. index both turns in Qdrant (soft failure — chat must not depend on it)
    let indexed = false;
    if (hasAiKey()) {
      try {
        const [userVec, assistantVec] = await Promise.all([
          embed(input.message),
          embed(reply),
        ]);
        await upsert([
          {
            id: userMessage.data!.messageUuid,
            vector: userVec,
            payload: {
              userUuid: identity.sub,
              chatUuid: input.chatUuid,
              messageUuid: userMessage.data!.messageUuid,
              role: 'user',
              text: input.message,
            },
          },
          {
            id: assistantMessage.data!.messageUuid,
            vector: assistantVec,
            payload: {
              userUuid: identity.sub,
              chatUuid: input.chatUuid,
              messageUuid: assistantMessage.data!.messageUuid,
              role: 'assistant',
              text: reply,
            },
          },
        ]);
        indexed = true;
      } catch (err) {
        console.warn('[aiChat] qdrant indexing skipped:', (err as Error).message);
      }
    }

    return c.json({
      success: true,
      messages: [userMessage.data, assistantMessage.data],
      citations,
      retrieved: chunks.length,
      indexed,
      mock: !hasAiKey(),
    });
  };

  return { validate, handler };
}
