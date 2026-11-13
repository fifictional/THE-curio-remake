/**
 * Unit tests for the `moveDocument` route (P3-2).
 *
 * Builds a fake data client + a fake Lambda client. Verifies the move/cascade
 * logic AND the EOPRD-813 re-embed invoke behaviour (fires only when the
 * document has flashcards + userUuid + the env function name is set; failures
 * are non-fatal).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { InvokeCommand, type LambdaClient } from '@aws-sdk/client-lambda';

import { appsyncAdapter } from '../shared/hono-appsync-adapter';
import { directInvokeAdapter } from '../shared/hono-direct-invoke-adapter';
import { authIdentity } from '../shared/middleware/auth-identity';
import { errorBoundary } from '../shared/middleware/error-boundary';
import {
  buildAppSyncEvent,
  buildCognitoIdentity,
  buildDirectInvokeEvent,
  buildLambdaContext,
} from '../shared/test-utils';
import type { HonoEnv } from '../shared/types';
import { createMoveDocumentRoute } from '../routes/move-document';
import type { HonoDataClient } from '../shared/data-client';

function buildClient(documentData: {
  spaceUuid?: string | null;
  flashcardDeckUuid?: string | null;
  userUuid?: string | null;
} | null) {
  const docGet = vi
    .fn()
    .mockResolvedValue(documentData === null ? null : { data: documentData });
  const docUpdate = vi.fn().mockResolvedValue({ data: {} });
  const spaceUpdate = vi.fn().mockResolvedValue({ data: {} });

  const client = {
    models: {
      Document: { get: docGet, update: docUpdate },
      Flashcard: {
        listFlashcardByDocumentUuidAndCreatedAt: vi.fn().mockResolvedValue({ data: [] }),
        update: vi.fn().mockResolvedValue({ data: {} }),
      },
      Question: {
        listQuestionByDocumentUuidAndCreatedAt: vi.fn().mockResolvedValue({ data: [] }),
        update: vi.fn().mockResolvedValue({ data: {} }),
      },
      Space: { update: spaceUpdate },
    },
  } as unknown as HonoDataClient;

  return { client, docGet, docUpdate, spaceUpdate };
}

function buildLambda(sendImpl?: () => Promise<unknown>) {
  const send = vi.fn().mockImplementation(sendImpl ?? (() => Promise.resolve({})));
  return { lambdaClient: { send } as unknown as LambdaClient, send };
}

function buildApp(
  client: HonoDataClient,
  lambdaClient: LambdaClient,
  embedFunctionName: () => string | undefined = () => 'embed-fn',
) {
  const app = new Hono<HonoEnv>();
  app.onError(errorBoundary);
  app.use('*', authIdentity);
  const route = createMoveDocumentRoute(client, { lambdaClient, embedFunctionName });
  app.post('/moveDocument', route.validate, route.handler);
  return app;
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('moveDocument route (P3-2)', () => {
  it('moves document and returns true (no re-embed when no flashcardDeckUuid)', async () => {
    const { client, docUpdate } = buildClient({ spaceUuid: 'orig', userUuid: 'u1' });
    const { lambdaClient, send } = buildLambda();
    const adapter = appsyncAdapter(buildApp(client, lambdaClient));

    const event = buildAppSyncEvent({
      fieldName: 'moveDocument',
      args: { documentUuid: 'doc-1', spaceUuid: 'target' },
      identity: buildCognitoIdentity(),
    });
    const result = await adapter(event, buildLambdaContext());

    expect(result).toBe(true);
    expect(docUpdate).toHaveBeenCalledWith(
      { documentUuid: 'doc-1', spaceUuid: 'target' },
      expect.anything(),
    );
    expect(send).not.toHaveBeenCalled();
  });

  it('fires re-embed invoke for both original + target spaces when document has flashcards', async () => {
    const { client } = buildClient({
      spaceUuid: 'orig',
      flashcardDeckUuid: 'deck-1',
      userUuid: 'u1',
    });
    const { lambdaClient, send } = buildLambda();
    const adapter = directInvokeAdapter(buildApp(client, lambdaClient));

    const event = buildDirectInvokeEvent('moveDocument', {
      documentUuid: 'doc-1',
      spaceUuid: 'target',
    });
    const result = await adapter(event, buildLambdaContext());

    expect(result).toBe(true);
    expect(send).toHaveBeenCalledTimes(2);
    const firstCmd = send.mock.calls[0][0] as InvokeCommand;
    expect(firstCmd).toBeInstanceOf(InvokeCommand);
    expect(firstCmd.input.InvocationType).toBe('Event');
    const payload = JSON.parse(firstCmd.input.Payload as string);
    expect(payload).toEqual({ spaceUuid: 'orig', userUuid: 'u1' });
  });

  it('re-embed invoke failure is non-fatal (still returns true)', async () => {
    const { client } = buildClient({
      spaceUuid: 'orig',
      flashcardDeckUuid: 'deck-1',
      userUuid: 'u1',
    });
    const { lambdaClient, send } = buildLambda(() => Promise.reject(new Error('lambda down')));
    const adapter = directInvokeAdapter(buildApp(client, lambdaClient));

    const event = buildDirectInvokeEvent('moveDocument', {
      documentUuid: 'doc-1',
      spaceUuid: 'target',
    });
    const result = await adapter(event, buildLambdaContext());

    expect(result).toBe(true);
    expect(send).toHaveBeenCalled();
  });

  it('skips re-embed when env function name is not configured', async () => {
    const { client } = buildClient({
      spaceUuid: 'orig',
      flashcardDeckUuid: 'deck-1',
      userUuid: 'u1',
    });
    const { lambdaClient, send } = buildLambda();
    const adapter = directInvokeAdapter(buildApp(client, lambdaClient, () => undefined));

    const event = buildDirectInvokeEvent('moveDocument', {
      documentUuid: 'doc-1',
      spaceUuid: 'target',
    });
    await adapter(event, buildLambdaContext());

    expect(send).not.toHaveBeenCalled();
  });

  it('throws "Document not found" when the document does not exist', async () => {
    const { client } = buildClient(null);
    const { lambdaClient } = buildLambda();
    const adapter = directInvokeAdapter(buildApp(client, lambdaClient));

    const event = buildDirectInvokeEvent('moveDocument', {
      documentUuid: 'missing',
      spaceUuid: 's',
    });
    const result = (await adapter(event, buildLambdaContext())) as {
      success: boolean;
      error: string;
    };

    expect(result.success).toBe(false);
    expect(result.error).toBe('Document not found');
  });

  it('400 on missing documentUuid', async () => {
    const { client } = buildClient({ spaceUuid: 'orig' });
    const { lambdaClient } = buildLambda();
    const adapter = directInvokeAdapter(buildApp(client, lambdaClient));

    const event = buildDirectInvokeEvent('moveDocument', { spaceUuid: 's' });
    const result = (await adapter(event, buildLambdaContext())) as {
      success: boolean;
      status: number;
    };

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
  });
});
