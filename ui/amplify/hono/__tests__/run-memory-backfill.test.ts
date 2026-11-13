/**
 * Unit tests for the `runMemoryBackfill` route (P2-6).
 *
 * Mocks `@ai-memory/index` (MemoryService + runQuizHistoryBackfill) so the
 * route file's top-level import resolves to test doubles. Mirrors the existing
 * handler contract — see `amplify/functions/memory-backfill/handler.ts`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const { isMemoryEnabledForUserMock, runQuizHistoryBackfillMock, consolidateBlocksForOwnerMock, MemoryServiceMock } =
  vi.hoisted(() => {
    const isMemoryEnabledForUserMock = vi.fn<(ownerUuid: string) => Promise<boolean>>();
    const runQuizHistoryBackfillMock = vi.fn<
      (
        client: unknown,
        memory: unknown,
        userUuid: string,
      ) => Promise<{ skipped: boolean; gapsCreated: number; masteredCreated: number }>
    >();
    const consolidateBlocksForOwnerMock = vi.fn<
      (ownerUuid: string) => Promise<{ removedDuplicates: number; resolvedCrossCategory: number }>
    >();
    const MemoryServiceMock = vi.fn().mockImplementation(() => ({
      isMemoryEnabledForUser: isMemoryEnabledForUserMock,
      consolidateBlocksForOwner: consolidateBlocksForOwnerMock,
    }));
    return {
      isMemoryEnabledForUserMock,
      runQuizHistoryBackfillMock,
      consolidateBlocksForOwnerMock,
      MemoryServiceMock,
    };
  });

vi.mock('@ai-memory/index', () => ({
  MemoryService: MemoryServiceMock,
  runQuizHistoryBackfill: runQuizHistoryBackfillMock,
}));

import { appsyncAdapter } from '../shared/hono-appsync-adapter';
import { directInvokeAdapter } from '../shared/hono-direct-invoke-adapter';
import { authIdentity } from '../shared/middleware/auth-identity';
import { errorBoundary } from '../shared/middleware/error-boundary';
import {
  buildAppSyncEvent,
  buildAmplifyFunctionHandlerEvent,
  buildCognitoIdentity,
  buildDirectInvokeEvent,
  buildLambdaContext,
} from '../shared/test-utils';
import type { HonoEnv } from '../shared/types';
import { createRunMemoryBackfillRoute } from '../routes/run-memory-backfill';
import type { HonoDataClient } from '../shared/data-client';

const fakeDataClient = {} as HonoDataClient;

function buildApp() {
  const app = new Hono<HonoEnv>();
  app.onError(errorBoundary);
  app.use('*', authIdentity);
  const route = createRunMemoryBackfillRoute(fakeDataClient);
  app.post('/runMemoryBackfill', route.validate, route.handler);
  return app;
}

beforeEach(() => {
  isMemoryEnabledForUserMock.mockReset();
  runQuizHistoryBackfillMock.mockReset();
  consolidateBlocksForOwnerMock.mockReset();
  consolidateBlocksForOwnerMock.mockResolvedValue({
    removedDuplicates: 0,
    resolvedCrossCategory: 0,
  });
});

describe('runMemoryBackfill route (P2-6)', () => {
  it('short-circuits when memory is disabled (no backfill, returns skipped:true and 0 counts)', async () => {
    isMemoryEnabledForUserMock.mockResolvedValue(false);
    const adapter = directInvokeAdapter(buildApp());

    const event = buildDirectInvokeEvent('runMemoryBackfill', { userUuid: 'user-1' });
    const result = await adapter(event, buildLambdaContext());

    expect(isMemoryEnabledForUserMock).toHaveBeenCalledExactlyOnceWith('user-1');
    expect(runQuizHistoryBackfillMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      skipped: true,
      gapsCreated: 0,
      masteredCreated: 0,
    });
  });

  it('runs backfill and returns the helper result when memory is enabled (AppSync)', async () => {
    isMemoryEnabledForUserMock.mockResolvedValue(true);
    runQuizHistoryBackfillMock.mockResolvedValue({
      skipped: false,
      gapsCreated: 12,
      masteredCreated: 4,
    });
    const adapter = appsyncAdapter(buildApp());

    const event = buildAppSyncEvent({
      fieldName: 'runMemoryBackfill',
      args: { userUuid: 'user-1' },
      identity: buildCognitoIdentity({ sub: 'user-1' }),
    });
    const result = await adapter(event, buildLambdaContext());

    expect(runQuizHistoryBackfillMock).toHaveBeenCalledOnce();
    expect(runQuizHistoryBackfillMock.mock.calls[0][2]).toBe('user-1');
    expect(result).toEqual({
      success: true,
      skipped: false,
      gapsCreated: 12,
      masteredCreated: 4,
      removedDuplicates: 0,
      resolvedCrossCategory: 0,
    });
  });

  it('runs backfill via Amplify Gen 2 flattened AppSync event (live runtime shape)', async () => {
    isMemoryEnabledForUserMock.mockResolvedValue(true);
    runQuizHistoryBackfillMock.mockResolvedValue({
      skipped: false,
      gapsCreated: 2,
      masteredCreated: 1,
    });
    const adapter = appsyncAdapter(buildApp());

    const event = buildAmplifyFunctionHandlerEvent({
      typeName: 'Mutation',
      fieldName: 'runMemoryBackfill',
      args: { userUuid: 'user-1' },
      identity: buildCognitoIdentity({ sub: 'user-1' }),
    });
    const result = await adapter(event, buildLambdaContext());

    expect(runQuizHistoryBackfillMock).toHaveBeenCalledOnce();
    expect(result).toEqual({
      success: true,
      skipped: false,
      gapsCreated: 2,
      masteredCreated: 1,
      removedDuplicates: 0,
      resolvedCrossCategory: 0,
    });
  });

  it('propagates helper-returned skipped:true (e.g. no quiz history) without running gaps/mastered logic', async () => {
    isMemoryEnabledForUserMock.mockResolvedValue(true);
    runQuizHistoryBackfillMock.mockResolvedValue({
      skipped: true,
      gapsCreated: 0,
      masteredCreated: 0,
    });
    const adapter = directInvokeAdapter(buildApp());

    const event = buildDirectInvokeEvent('runMemoryBackfill', { userUuid: 'user-1' });
    const result = await adapter(event, buildLambdaContext());

    expect(consolidateBlocksForOwnerMock).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({
      success: true,
      skipped: true,
      gapsCreated: 0,
      masteredCreated: 0,
      removedDuplicates: 0,
      resolvedCrossCategory: 0,
    });
  });

  it('400 on missing userUuid (validateBody)', async () => {
    const adapter = directInvokeAdapter(buildApp());

    const event = buildDirectInvokeEvent('runMemoryBackfill', {});
    const result = (await adapter(event, buildLambdaContext())) as {
      success: boolean;
      status: number;
    };

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(isMemoryEnabledForUserMock).not.toHaveBeenCalled();
  });

  it('errorBoundary catches helper errors on direct-invoke', async () => {
    isMemoryEnabledForUserMock.mockResolvedValue(true);
    runQuizHistoryBackfillMock.mockRejectedValue(new Error('quiz table read failed'));
    const adapter = directInvokeAdapter(buildApp());

    const event = buildDirectInvokeEvent('runMemoryBackfill', { userUuid: 'user-1' });
    const result = (await adapter(event, buildLambdaContext())) as {
      success: boolean;
      error: string;
    };

    expect(result.success).toBe(false);
    expect(result.error).toBe('quiz table read failed');
  });
});
