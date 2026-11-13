/**
 * `moveDocument` mutation route — P3-2.
 *
 * Source: `amplify/functions/move-document/handler.ts` (128 LOC).
 *
 * Migration parity:
 *   - Same move/cascade/fake-update logic as `moveChat`, but keyed on
 *     `documentUuid` (and the Flashcard/Question list queries are the
 *     `*ByDocumentUuidAndCreatedAt` variants).
 *   - **EOPRD-813 re-embed** (the distinguishing behaviour): when the moved
 *     document has flashcards (`flashcardDeckUuid` set) and a `userUuid`, the
 *     handler fires an async (`InvocationType: 'Event'`) invoke of the
 *     `embed-space-flashcards` Lambda for BOTH the original and target spaces.
 *     Failures are caught + logged (non-fatal) — preserved exactly.
 *
 * **IAM/env**: the original reads `EMBED_SPACE_FLASHCARDS_FUNCTION_NAME` from
 * env and holds a `lambda:InvokeFunction` grant on that ARN. Both are mirrored
 * onto Hono-Heavy in `amplify/backend.ts`. Per §10.5 P3-2 the invoke target
 * stays the EXISTING `embed-space-flashcards` Lambda (not the future Hono-Heavy
 * route) until Phase 5 cutover — dual-Lambda strategy.
 *
 * The Lambda client is injected via deps for testability; production uses a
 * module-level `@aws-sdk/client-lambda` client.
 *
 * AppSync field shape (from `amplify/data/resource.ts:1034-1042`):
 *
 *   moveDocument(documentUuid: ID!, spaceUuid: ID!): Boolean
 *
 * @see docs/2026-05-27-amplify-to-hono-migration-plan.md §10.5 P3-2.
 */

import type { Context, MiddlewareHandler } from 'hono';
import { z } from 'zod';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

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

export const MoveDocumentArgs = z.object({
  documentUuid: z.string().min(1, 'Document UUID is required'),
  spaceUuid: z.string().nullish(),
});

export interface MoveDocumentRoute {
  validate: MiddlewareHandler<HonoEnv>;
  handler: (c: Context<HonoEnv>) => Promise<Response>;
}

export interface MoveDocumentDeps {
  lambdaClient?: LambdaClient;
  // Override for tests; production reads process.env at request time.
  embedFunctionName?: () => string | undefined;
}

export function createMoveDocumentRoute(
  client: HonoDataClient,
  deps: MoveDocumentDeps = {},
): MoveDocumentRoute {
  const validate = validateBody(MoveDocumentArgs);
  const lambdaClient = deps.lambdaClient ?? new LambdaClient({});
  const resolveEmbedFnName =
    deps.embedFunctionName ??
    (() => process.env.EMBED_SPACE_FLASHCARDS_FUNCTION_NAME);

  const handler = async (c: Context<HonoEnv>): Promise<Response> => {
    const { documentUuid, spaceUuid } =
      getValidatedBody<typeof MoveDocumentArgs>(c);

    const targetSpaceUuid =
      spaceUuid && spaceUuid.trim() !== '' ? spaceUuid : null;

    const document = await client.models.Document.get({ documentUuid });
    if (!document || !document.data) {
      throw new Error('Document not found');
    }

    const originalSpaceUuid = document.data.spaceUuid;

    await client.models.Document.update(
      { documentUuid, spaceUuid: targetSpaceUuid },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Amplify
      // selectionSet union is 100k+ members; `as any` matches the original
      // handler and avoids a multi-minute tsc type-instantiation blowup.
      { selectionSet: DOCUMENT_SELECTION_SET as any },
    );

    const flashcards = await client.models.Flashcard.listFlashcardByDocumentUuidAndCreatedAt(
      { documentUuid },
      { limit: 1000 },
    );
    const questions = await client.models.Question.listQuestionByDocumentUuidAndCreatedAt(
      { documentUuid },
      { limit: 1000 },
    );

    const flashcardsPromises = flashcards.data?.map((flashcard) =>
      client.models.Flashcard.update({
        flashcardUuid: flashcard.flashcardUuid,
        spaceUuid: targetSpaceUuid,
        createdAt: flashcard.createdAt,
      }),
    );
    const questionsPromises = questions.data?.map((question) =>
      client.models.Question.update({
        questionUuid: question.questionUuid,
        spaceUuid: targetSpaceUuid,
        createdAt: question.createdAt,
      }),
    );

    await Promise.all([
      ...(flashcardsPromises || []),
      ...(questionsPromises || []),
    ]);

    if (targetSpaceUuid) {
      await client.models.Space.update(
        { spaceUuid: targetSpaceUuid },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { selectionSet: SPACE_SELECTION_SET as any },
      );
    }
    if (originalSpaceUuid) {
      await client.models.Space.update(
        { spaceUuid: originalSpaceUuid },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { selectionSet: SPACE_SELECTION_SET as any },
      );
    }

    // EOPRD-813: Re-embed flashcard RAG for both spaces when the document has
    // flashcards and was moved. Async (fire-and-forget) — failures are logged
    // but never fail the request.
    const hasFlashcards = !!document.data?.flashcardDeckUuid;
    const userUuid = document.data?.userUuid;
    const embedFnName = resolveEmbedFnName();
    if (hasFlashcards && userUuid && embedFnName) {
      const spacesToReembed = [originalSpaceUuid, targetSpaceUuid].filter(
        (s): s is string => !!s && s.trim() !== '',
      );
      for (const reembedSpaceUuid of spacesToReembed) {
        try {
          await lambdaClient.send(
            new InvokeCommand({
              FunctionName: embedFnName,
              InvocationType: 'Event',
              Payload: JSON.stringify({ spaceUuid: reembedSpaceUuid, userUuid }),
            }),
          );
        } catch (embedErr) {
          console.error(
            JSON.stringify({
              msg: 'moveDocument.embed-invoke-failed',
              spaceUuid: reembedSpaceUuid,
              error: embedErr instanceof Error ? embedErr.message : String(embedErr),
            }),
          );
        }
      }
    }

    return c.json(true);
  };

  return { validate, handler };
}
