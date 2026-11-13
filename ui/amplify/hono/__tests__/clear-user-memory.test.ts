/**
 * Unit tests for the `clearUserMemory` route (P2-4).
 *
 * Tests the full middleware stack (validate → handler) via both adapter
 * paths (AppSync and direct-invoke), with `MemoryService` mocked at the
 * module level so we don't need a real AppSync data client.
 *
 * Mirrors the existing handler's contract — see
 * `amplify/functions/clear-user-memory/handler.ts` + `amplify/data/resource.ts:1474-1484`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const clearAllForOwnerMock = vi.fn<(ownerUuid: string) => Promise<number>>();

vi.mock('@ai-memory/memory-service', () => ({
  MemoryService: vi.fn().mockImplementation(() => ({
    clearAllForOwner: clearAllForOwnerMock,
  })),
}));

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
import { createClearUserMemoryRoute } from '../routes/clear-user-memory';
import type { HonoDataClient } from '../shared/data-client';

const fakeDataClient = {} as HonoDataClient;

function buildApp() {
  const app = new Hono<HonoEnv>();
  app.onError(errorBoundary);
  app.use('*', authIdentity);
  const route = createClearUserMemoryRoute(fakeDataClient);
  app.post('/clearUserMemory', route.validate, route.handler);
  return app;
}

beforeEach(() => {
  clearAllForOwnerMock.mockReset();
});

describe('clearUserMemory route (P2-4)', () => {
  describe('AppSync path', () => {
    it('clears memory for the given userUuid and returns {success, deletedCount}', async () => {
      clearAllForOwnerMock.mockResolvedValue(7);
      const adapter = appsyncAdapter(buildApp());

      const event = buildAppSyncEvent({
        fieldName: 'clearUserMemory',
        args: { userUuid: 'user-1' },
        identity: buildCognitoIdentity({ sub: 'user-1' }),
      });
      const result = await adapter(event, buildLambdaContext());

      expect(clearAllForOwnerMock).toHaveBeenCalledExactlyOnceWith('user-1');
      expect(result).toEqual({ success: true, deletedCount: 7 });
    });

    it('throws (so AppSync surfaces a GraphQL error) when userUuid is missing', async () => {
      const adapter = appsyncAdapter(buildApp());

      const event = buildAppSyncEvent({
        fieldName: 'clearUserMemory',
        args: {},
        identity: buildCognitoIdentity(),
      });

      await expect(adapter(event, buildLambdaContext())).rejects.toThrow(/Validation failed/);
      expect(clearAllForOwnerMock).not.toHaveBeenCalled();
    });

    it('propagates MemoryService errors as AppSync errors', async () => {
      clearAllForOwnerMock.mockRejectedValue(new Error('Neptune unavailable'));
      const adapter = appsyncAdapter(buildApp());

      const event = buildAppSyncEvent({
        fieldName: 'clearUserMemory',
        args: { userUuid: 'user-1' },
        identity: buildCognitoIdentity({ sub: 'user-1' }),
      });

      await expect(adapter(event, buildLambdaContext())).rejects.toThrow(/Neptune unavailable/);
    });
  });

  describe('Direct-invoke path', () => {
    it('clears memory and returns the same response shape (no extra wrapping)', async () => {
      clearAllForOwnerMock.mockResolvedValue(3);
      const adapter = directInvokeAdapter(buildApp());

      const event = buildDirectInvokeEvent('clearUserMemory', { userUuid: 'user-42' });
      const result = await adapter(event, buildLambdaContext());

      expect(clearAllForOwnerMock).toHaveBeenCalledExactlyOnceWith('user-42');
      expect(result).toEqual({ success: true, deletedCount: 3 });
    });

    it('returns {success:false, ...issues, status:400} on invalid args (no throw)', async () => {
      const adapter = directInvokeAdapter(buildApp());

      const event = buildDirectInvokeEvent('clearUserMemory', {});
      const result = (await adapter(event, buildLambdaContext())) as {
        success: boolean;
        status: number;
        error: string;
      };

      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error).toMatch(/Validation failed/);
      expect(clearAllForOwnerMock).not.toHaveBeenCalled();
    });

    it('returns {success:false, error} when MemoryService rejects (errorBoundary catches)', async () => {
      clearAllForOwnerMock.mockRejectedValue(new Error('downstream failure'));
      const adapter = directInvokeAdapter(buildApp());

      const event = buildDirectInvokeEvent('clearUserMemory', { userUuid: 'user-1' });
      const result = (await adapter(event, buildLambdaContext())) as {
        success: boolean;
        error: string;
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('downstream failure');
    });
  });
});
