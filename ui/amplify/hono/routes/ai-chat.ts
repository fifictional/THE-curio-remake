/**
 * `aiChat` query route — P3-12.
 *
 * Source: `amplify/functions/ai-chat/handler.ts`
 * Core logic: `run-ai-chat.ts`.
 *
 * Registered at AppSync path (`/aiChat`) and ProcessDocument direct-invoke
 * path (`/ai-chat`). Business failures return `{ success: false, error }`
 * with HTTP 200 — the original handler catches and returns without throwing.
 *
 * @see docs/2026-05-27-amplify-to-hono-migration-plan.md §10.5 P3-12.
 */

import type { Context, MiddlewareHandler } from 'hono';
import { z } from 'zod';

import { runAiChat } from '../../functions/ai-chat/run-ai-chat';
import type { HonoDataClient } from '../shared/data-client';
import {
  getValidatedBody,
  validateBody,
} from '../shared/middleware/validate';
import type { HonoEnv } from '../shared/types';

export const AiChatArgs = z.object({
  chatUuid: z.string().min(1),
  userUuid: z.string().min(1),
  message: z.string().min(1),
  messageUuid: z.string().min(1),
  image: z.string().optional(),
  taskUuid: z.string().min(1),
  chatType: z.enum(['main', 'question', 'mock_exam', 'document']),
  chatArgs: z.record(z.string(), z.unknown()),
});

export interface AiChatRoute {
  validate: MiddlewareHandler<HonoEnv>;
  handler: (c: Context<HonoEnv>) => Promise<Response>;
}

export function createAiChatRoute(client: HonoDataClient): AiChatRoute {
  const validate = validateBody(AiChatArgs);

  const handler = async (c: Context<HonoEnv>): Promise<Response> => {
    const input = getValidatedBody<typeof AiChatArgs>(c);
    const result = await runAiChat(client, input);
    return c.json(result);
  };

  return { validate, handler };
}
