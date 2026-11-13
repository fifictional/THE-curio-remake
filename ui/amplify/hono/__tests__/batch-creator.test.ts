/**
 * Unit tests for `batchCreator` route (P3-9).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

import { appsyncAdapter } from '../shared/hono-appsync-adapter';
import { scheduledAdapter } from '../shared/hono-scheduled-adapter';
import { authIdentity } from '../shared/middleware/auth-identity';
import { errorBoundary } from '../shared/middleware/error-boundary';
import { buildAppSyncEvent, buildLambdaContext } from '../shared/test-utils';
import type { HonoEnv } from '../shared/types';
import { createBatchCreatorRoute } from '../routes/batch-creator';
import type { HonoDataClient } from '../shared/data-client';

const { runBatchCreatorMock } = vi.hoisted(() => ({
  runBatchCreatorMock: vi.fn(),
}));

vi.mock('../../functions/batch-processor/batch-creator/run-batch-creator', () => ({
  runBatchCreator: runBatchCreatorMock,
}));

const client = {} as HonoDataClient;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('batchCreator route (P3-9)', () => {
  it('handles EventBridge custom cron payload via scheduled adapter', async () => {
    runBatchCreatorMock.mockResolvedValue({
      success: true,
      jobType: 'chat-summary-embed',
      jobsQueued: 2,
    });
    const app = new Hono<HonoEnv>();
    app.onError(errorBoundary);
    app.use('*', authIdentity);
    const route = createBatchCreatorRoute(client, () => 'https://sqs.example/queue');
    app.post('/__cron/batch-creator', route.validate, route.handler);

    const result = await scheduledAdapter(app)(
      {
        arguments: {
          jobType: 'chat-summary-embed',
          jobName: 'Chat Summary Embed',
        },
      },
      buildLambdaContext(),
    );

    expect(result).toEqual({
      success: true,
      jobType: 'chat-summary-embed',
      jobsQueued: 2,
    });
    expect(runBatchCreatorMock).toHaveBeenCalledWith(
      client,
      { jobType: 'chat-summary-embed', jobName: 'Chat Summary Embed' },
      { queueUrl: 'https://sqs.example/queue' },
    );
  });

  it('accepts AppSync __LIST_JOBS__ when jobName is null (optional GraphQL arg)', async () => {
    runBatchCreatorMock.mockResolvedValue({
      success: true,
      jobs: [{ name: 'Memory Consolidation', jobType: 'memory-consolidation', description: 'test' }],
    });
    const app = new Hono<HonoEnv>();
    app.onError(errorBoundary);
    app.use('*', authIdentity);
    const route = createBatchCreatorRoute(client, () => 'https://sqs.example/queue');
    app.post('/batchCreator', route.validate, route.handler);

    const result = await appsyncAdapter(app)(
      buildAppSyncEvent({
        fieldName: 'batchCreator',
        parentTypeName: 'Mutation',
        args: { jobType: '__LIST_JOBS__', jobName: null as unknown as string },
      }),
      buildLambdaContext(),
    );

    expect(result).toEqual({
      success: true,
      jobs: [{ name: 'Memory Consolidation', jobType: 'memory-consolidation', description: 'test' }],
    });
    expect(runBatchCreatorMock).toHaveBeenCalledWith(
      client,
      { jobType: '__LIST_JOBS__', jobName: undefined },
      { queueUrl: 'https://sqs.example/queue' },
    );
  });
});
