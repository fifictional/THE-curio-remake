/**
 * `moveAllUserResources` mutation route — P3-3.
 *
 * Source: `amplify/functions/move-all-user-resources/handler.ts` (108 LOC).
 *
 * Migration parity:
 *   - Finds all Documents AND Chats owned by `userUuid` within `spaceUuid`
 *     (both paginated at limit 1000, filtered by `userUuid`), then moves every
 *     one to no-folder (`spaceUuid: null`).
 *   - Fake-updates the source space afterwards to refresh derived counts.
 *   - Returns `{documentsMoved, chatsMoved}` (AppSync custom type).
 *
 * Both `userUuid` and `spaceUuid` are required; error messages preserved
 * verbatim ('User UUID is required', 'Space UUID is required').
 *
 * AppSync field shape (from `amplify/data/resource.ts:1052-1063`):
 *
 *   moveAllUserResources(userUuid: ID!, spaceUuid: ID!): {
 *     documentsMoved: Int!, chatsMoved: Int!
 *   }
 *
 * @see docs/2026-05-27-amplify-to-hono-migration-plan.md §10.5 P3-3.
 */

import type { Context, MiddlewareHandler } from 'hono';
import { z } from 'zod';

import type { HonoDataClient } from '../shared/data-client';
import {
  getValidatedBody,
  validateBody,
} from '../shared/middleware/validate';
import type { HonoEnv } from '../shared/types';

const SPACE_SELECTION_SET = [
  'spaceUuid',
  'name',
  'userUuid',
  'updatedAt',
  'createdAt',
  'documents.documentUuid',
  'chats.chatUuid',
] as const;

const DOCUMENT_SELECTION_SET = [
  'documentUuid',
  'userUuid',
  'spaceUuid',
  'type',
  'fileName',
  'key',
  'originalKey',
  'documentSummaries.documentSummaryUuid',
  'documentSummaries.tags',
  'createdAt',
  'updatedAt',
  'space.name',
] as const;

const CHAT_SELECTION_SET = [
  'chatUuid',
  'userUuid',
  'spaceUuid',
  'documentUuid',
  'name',
  'createdAt',
  'updatedAt',
  'space.name',
] as const;

export const MoveAllUserResourcesArgs = z.object({
  userUuid: z.string().min(1, 'User UUID is required'),
  spaceUuid: z.string().min(1, 'Space UUID is required'),
});

export interface MoveAllUserResourcesRoute {
  validate: MiddlewareHandler<HonoEnv>;
  handler: (c: Context<HonoEnv>) => Promise<Response>;
}

export function createMoveAllUserResourcesRoute(
  client: HonoDataClient,
): MoveAllUserResourcesRoute {
  const validate = validateBody(MoveAllUserResourcesArgs);

  const handler = async (c: Context<HonoEnv>): Promise<Response> => {
    const { userUuid, spaceUuid } =
      getValidatedBody<typeof MoveAllUserResourcesArgs>(c);

    const documentsResponse = await client.models.Document.listDocumentBySpaceUuidAndCreatedAt(
      { spaceUuid },
      { filter: { userUuid: { eq: userUuid } }, limit: 1000 },
    );
    const documents = documentsResponse.data || [];

    const chatsResponse = await client.models.Chat.listChatBySpaceUuidAndCreatedAt(
      { spaceUuid },
      { filter: { userUuid: { eq: userUuid } }, limit: 1000 },
    );
    const chats = chatsResponse.data || [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Amplify
    // selectionSet union is 100k+ members; `as any` matches the original
    // handler and avoids a multi-minute tsc type-instantiation blowup.
    const documentMovePromises = documents.map((document) =>
      client.models.Document.update(
        { documentUuid: document.documentUuid, spaceUuid: null },
        { selectionSet: DOCUMENT_SELECTION_SET as any },
      ),
    );

    const chatMovePromises = chats.map((chat) =>
      client.models.Chat.update(
        { chatUuid: chat.chatUuid, spaceUuid: null },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { selectionSet: CHAT_SELECTION_SET as any },
      ),
    );

    await Promise.all([...documentMovePromises, ...chatMovePromises]);

    await client.models.Space.update(
      { spaceUuid },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { selectionSet: SPACE_SELECTION_SET as any },
    );

    return c.json({
      documentsMoved: documents.length,
      chatsMoved: chats.length,
    });
  };

  return { validate, handler };
}
