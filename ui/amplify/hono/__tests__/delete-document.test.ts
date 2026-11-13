/**
 * Unit tests for `deleteDocument` route (P3-4).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

import { appsyncAdapter } from '../shared/hono-appsync-adapter';
import { authIdentity } from '../shared/middleware/auth-identity';
import { errorBoundary } from '../shared/middleware/error-boundary';
import {
  buildAppSyncEvent,
  buildCognitoIdentity,
  buildLambdaContext,
} from '../shared/test-utils';
import type { HonoEnv } from '../shared/types';
import { createDeleteDocumentRoute } from '../routes/delete-document';
import type { HonoDataClient } from '../shared/data-client';

const { runDeleteDocumentMock } = vi.hoisted(() => ({
  runDeleteDocumentMock: vi.fn(),
}));

vi.mock('../../functions/delete-document/run-delete-document', () => ({
  runDeleteDocument: runDeleteDocumentMock,
}));

const client = {} as HonoDataClient;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('deleteDocument route (P3-4)', () => {
  it('returns true when deletion succeeds', async () => {
    runDeleteDocumentMock.mockResolvedValue(true);
    const app = new Hono<HonoEnv>();
    app.onError(errorBoundary);
    app.use('*', authIdentity);
    const route = createDeleteDocumentRoute(client, {
      bucketName: () => 'bucket',
      openSearchIndex: () => 'rag-documents',
    });
    app.post('/deleteDocument', route.validate, route.handler);

    const event = buildAppSyncEvent({
      fieldName: 'deleteDocument',
      args: { documentUuid: 'doc-1' },
      identity: buildCognitoIdentity(),
      parentTypeName: 'Query',
    });

    const result = await appsyncAdapter(app)(event, buildLambdaContext());
    expect(result).toBe(true);
    expect(runDeleteDocumentMock).toHaveBeenCalledWith(
      client,
      'doc-1',
      expect.objectContaining({
        bucketName: 'bucket',
        openSearchIndex: 'rag-documents',
      }),
    );
  });
});
