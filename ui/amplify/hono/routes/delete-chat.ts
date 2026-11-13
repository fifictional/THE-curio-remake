/**
 * `deleteChat` query route — P2-7.
 *
 * Source: `amplify/functions/delete-chat/handler.ts` (36 LOC) + the shared
 * helper `amplify/functions/common/delete-chat.ts::deleteChatData`.
 *
 * Migration parity: route delegates to the existing `deleteChatData` helper —
 * NO logic was duplicated. The helper transitively reads/writes Chat, Message,
 * ChatCitation, and Space models; those grants are covered by
 * `allow.resource(honoLight)` in `amplify/data/resource.ts` (P0-7).
 *
 * AppSync field shape (from `amplify/data/resource.ts:1072-1079`):
 *
 *   deleteChat(chatUuid: ID!): Boolean
 *
 * Note: the field is registered as a **query** even though it has side effects
 * (matches the existing schema; not changed here). Auth is `publicApiKey()`
 * only on the AppSync field — the Lambda role has the data permissions, and
 * the public API key is granted access by `allow.publicApiKey()`. Same shape
 * carries over.
 *
 * Returns `true` on success. The shared helper throws `'Chat not found'` when
 * the chatUuid doesn't exist — the error-boundary middleware converts that
 * into the invocation-type-appropriate response (GraphQL error for AppSync,
 * `{success:false, error:'Chat not found'}` for direct invoke).
 *
 * @see docs/2026-05-27-amplify-to-hono-migration-plan.md §10.4 P2-7.
 */

import type { Context, MiddlewareHandler } from 'hono';
import { z } from 'zod';

import { deleteChatData } from '../../functions/common/delete-chat';
import type { HonoDataClient } from '../shared/data-client';
import {
  getValidatedBody,
  validateBody,
} from '../shared/middleware/validate';
import type { HonoEnv } from '../shared/types';

export const DeleteChatArgs = z.object({
  chatUuid: z.string().min(1, 'chatUuid is required'),
});

export interface DeleteChatRoute {
  validate: MiddlewareHandler<HonoEnv>;
  handler: (c: Context<HonoEnv>) => Promise<Response>;
}

export function createDeleteChatRoute(client: HonoDataClient): DeleteChatRoute {
  const validate = validateBody(DeleteChatArgs);

  const handler = async (c: Context<HonoEnv>): Promise<Response> => {
    const { chatUuid } = getValidatedBody<typeof DeleteChatArgs>(c);

    // The shared helper takes an optional logger. Use console-backed shims so
    // its messages flow through Hono-Light's CloudWatch stream with the same
    // structure as the rest of the request lifecycle.
    await deleteChatData(client, chatUuid, {
      info: (msg, meta) =>
        console.info(JSON.stringify({ msg: 'deleteChat.info', detail: msg, meta })),
      warn: (msg, meta) =>
        console.warn(JSON.stringify({ msg: 'deleteChat.warn', detail: msg, meta })),
      error: (msg, meta) =>
        console.error(JSON.stringify({ msg: 'deleteChat.error', detail: msg, meta })),
    });

    // Existing AppSync return type is `Boolean` (see amplify/data/resource.ts:1077).
    // c.json(true) sends literal JSON `true` which the AppSync adapter unwraps
    // to `true` and AppSync returns to the GraphQL client as `Boolean: true`.
    return c.json(true);
  };

  return { validate, handler };
}
