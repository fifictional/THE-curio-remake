/**
 * `GET /messages?chat=<uuid>` — the chat read path.
 *
 * Replaces the old chain:
 *   client.models.Message.list(...) -> AppSync -> auto-resolver -> DynamoDB
 *
 * Now:
 *   fetch -> Hono -> data seam -> Postgres
 */

import type { Context, MiddlewareHandler } from 'hono';
import { z } from 'zod';

import type { HonoDataClient } from '../data-client';
import { getValidatedBody, validateBody } from '../middleware/validate';
import type { HonoEnv } from '../types';

export const ListMessagesQuery = z.object({
  chat: z.string().min(1, 'chat query parameter is required'),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export const CreateMessageArgs = z.object({
  chatUuid: z.string().min(1),
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
});

export interface MessagesRoute {
  list: (c: Context<HonoEnv>) => Promise<Response>;
  createValidate: MiddlewareHandler<HonoEnv>;
  create: (c: Context<HonoEnv>) => Promise<Response>;
}

type Identity = { sub: string } | null;

/**
 * Ownership guard. The old stack relied on `allow.publicApiKey` plus
 * hand-written checks; here a chat is only readable/writable by its owner.
 * (The next step is doing this in Postgres with RLS so it cannot be forgotten.)
 */
async function ownsChat(
  client: HonoDataClient,
  identity: Identity,
  chatUuid: string,
): Promise<{ ok: true } | { ok: false; status: 401 | 404; error: string }> {
  if (!identity) return { ok: false, status: 401, error: 'Not signed in' };
  const chat = await client.models.Chat.get({ chatUuid });
  if (!chat.data || chat.data.userUuid !== identity.sub) {
    return { ok: false, status: 404, error: 'Chat not found' };
  }
  return { ok: true };
}

export function createMessagesRoute(client: HonoDataClient): MessagesRoute {
  const createValidate = validateBody(CreateMessageArgs);

  const list = async (c: Context<HonoEnv>): Promise<Response> => {
    const parsed = ListMessagesQuery.safeParse({
      chat: c.req.query('chat'),
      limit: c.req.query('limit'),
    });

    if (!parsed.success) {
      return c.json(
        { success: false, error: 'Invalid query', issues: parsed.error.flatten() },
        400,
      );
    }

    const gate = await ownsChat(client, c.var.identity as Identity, parsed.data.chat);
    if (!gate.ok) return c.json({ success: false, error: gate.error }, gate.status);

    const result = await client.models.Message.listByChat(
      { chatUuid: parsed.data.chat },
      { limit: parsed.data.limit },
    );

    return c.json({ success: true, messages: result.data ?? [] });
  };

  const create = async (c: Context<HonoEnv>): Promise<Response> => {
    const input = getValidatedBody<typeof CreateMessageArgs>(c);
    const gate = await ownsChat(client, c.var.identity as Identity, input.chatUuid);
    if (!gate.ok) return c.json({ success: false, error: gate.error }, gate.status);

    const result = await client.models.Message.create(input);
    return c.json({ success: true, message: result.data });
  };

  return { list, createValidate, create };
}
