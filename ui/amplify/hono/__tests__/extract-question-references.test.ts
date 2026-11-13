/**
 * Unit tests for `extractQuestionReferences` route (P3-10).
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
import { createExtractQuestionReferencesRoute } from '../routes/extract-question-references';
import type { HonoDataClient } from '../shared/data-client';

const { runExtractQuestionReferencesMock } = vi.hoisted(() => ({
  runExtractQuestionReferencesMock: vi.fn(),
}));

vi.mock('../../functions/extract-question-references/run-extract-question-references', () => ({
  runExtractQuestionReferences: runExtractQuestionReferencesMock,
}));

const client = {} as HonoDataClient;

function buildApp() {
  const app = new Hono<HonoEnv>();
  app.onError(errorBoundary);
  app.use('*', authIdentity);
  const route = createExtractQuestionReferencesRoute(client, () => 'test-bucket');
  app.post('/extractQuestionReferences', route.validate, route.handler);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('extractQuestionReferences route (P3-10)', () => {
  it('returns processed count from run module', async () => {
    runExtractQuestionReferencesMock.mockResolvedValue({
      success: true,
      processedCount: 3,
    });
    const app = buildApp();
    const event = buildAppSyncEvent({
      fieldName: 'extractQuestionReferences',
      args: { questionExtractJobUuid: 'job-1' },
      identity: buildCognitoIdentity(),
      parentTypeName: 'Mutation',
    });

    const result = await appsyncAdapter(app)(event, buildLambdaContext());

    expect(result).toEqual({ success: true, processedCount: 3 });
    expect(runExtractQuestionReferencesMock).toHaveBeenCalledWith(
      client,
      'test-bucket',
      { questionExtractJobUuid: 'job-1' },
    );
  });

  it('passes optional questionUuids filter', async () => {
    runExtractQuestionReferencesMock.mockResolvedValue({
      success: true,
      processedCount: 1,
    });
    const app = buildApp();
    const event = buildAppSyncEvent({
      fieldName: 'extractQuestionReferences',
      args: {
        questionExtractJobUuid: 'job-1',
        questionUuids: ['q-1', 'q-2'],
      },
      identity: buildCognitoIdentity(),
      parentTypeName: 'Mutation',
    });

    await appsyncAdapter(app)(event, buildLambdaContext());

    expect(runExtractQuestionReferencesMock).toHaveBeenCalledWith(
      client,
      'test-bucket',
      {
        questionExtractJobUuid: 'job-1',
        questionUuids: ['q-1', 'q-2'],
      },
    );
  });
});
