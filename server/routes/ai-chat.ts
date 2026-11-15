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
import { upsert } from '../qdrant';
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

export function createAiChatRoute(): AiChatRoute {
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

    // 2. build context from stored history (RLS keeps it to this user's rows)
    const history = await client.models.Message.listByChat(
      { chatUuid: input.chatUuid },
      { limit: input.historyLimit ?? 20 },
    );
    const turns = (history.data ?? []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // 3. ask the model
    const reply = await chat(turns);

    // 4. persist the assistant message
    const assistantMessage = await client.models.Message.create({
      chatUuid: input.chatUuid,
      role: 'assistant',
      content: reply,
    });

    // 5. index both turns in Qdrant (soft failure — chat must not depend on it)
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
      indexed,
      mock: !hasAiKey(),
    });
  };

  return { validate, handler };
}
