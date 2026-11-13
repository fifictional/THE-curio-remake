/**
 * Unit tests for the `enqueueMemoryEvent` route (P2-3).
 *
 * Mocks `@ai-memory/index` (MemoryService + publishMemoryEvent) via vi.hoisted
 * so the route file's top-level import resolves to the mocks. Covers:
 *   - memory-disabled short-circuit (returns success:true, skipped:true)
 *   - identity-consistency check (parsed.ownerUuid !== userUuid → throws)
 *   - JSON.parse failure on malformed payload
 *   - happy path publishes the event and returns success:true, skipped:false
 *
 * Mirrors the existing handler contract — see
 * `amplify/functions/enqueue-memory-event/handler.ts`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const { isMemoryEnabledForUserMock, publishMemoryEventMock, MemoryServiceMock } =
  vi.hoisted(() => {
    const isMemoryEnabledForUserMock = vi.fn<(ownerUuid: string) => Promise<boolean>>();
    const publishMemoryEventMock = vi.fn<(event: unknown) => Promise<void>>();
    const MemoryServiceMock = vi.fn().mockImplementation(() => ({
      isMemoryEnabledForUser: isMemoryEnabledForUserMock,
    }));
    return { isMemoryEnabledForUserMock, publishMemoryEventMock, MemoryServiceMock };
  });

vi.mock('@ai-memory/index', () => ({
  MemoryService: MemoryServiceMock,
  publishMemoryEvent: publishMemoryEventMock,
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
import { createEnqueueMemoryEventRoute } from '../routes/enqueue-memory-event';
import type { HonoDataClient } from '../shared/data-client';

const fakeDataClient = {} as HonoDataClient;

function buildApp() {
  const app = new Hono<HonoEnv>();
  app.onError(errorBoundary);
  app.use('*', authIdentity);
  const route = createEnqueueMemoryEventRoute(fakeDataClient);
  app.post('/enqueueMemoryEvent', route.validate, route.handler);
  return app;
}

beforeEach(() => {
  isMemoryEnabledForUserMock.mockReset();
  publishMemoryEventMock.mockReset();
});

describe('enqueueMemoryEvent route (P2-3)', () => {
  const validPayload = JSON.stringify({
    ownerUuid: 'user-1',
    eventType: 'chat-completed',
    chatUuid: 'chat-1',
  });

  describe('Memory-disabled short-circuit', () => {
    it('returns {success:true, skipped:true} without publishing', async () => {
      isMemoryEnabledForUserMock.mockResolvedValue(false);
      const adapter = directInvokeAdapter(buildApp());

      const event = buildDirectInvokeEvent('enqueueMemoryEvent', {
        userUuid: 'user-1',
        payload: validPayload,
      });
      const result = await adapter(event, buildLambdaContext());

      expect(isMemoryEnabledForUserMock).toHaveBeenCalledExactlyOnceWith('user-1');
      expect(publishMemoryEventMock).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, skipped: true });
    });
  });

  describe('Identity-consistency check (preserved from original)', () => {
    it('throws "ownerUuid must match authenticated user" when payload.ownerUuid !== userUuid', async () => {
      isMemoryEnabledForUserMock.mockResolvedValue(true);
      const adapter = appsyncAdapter(buildApp());

      const mismatchedPayload = JSON.stringify({
        ownerUuid: 'attacker',
        eventType: 'chat-completed',
        chatUuid: 'chat-1',
      });
      const event = buildAppSyncEvent({
        fieldName: 'enqueueMemoryEvent',
        args: { userUuid: 'victim', payload: mismatchedPayload },
        identity: buildCognitoIdentity({ sub: 'attacker' }),
      });

      await expect(adapter(event, buildLambdaContext())).rejects.toThrow(
        /ownerUuid must match authenticated user/,
      );
      expect(publishMemoryEventMock).not.toHaveBeenCalled();
    });

    it('surfaces the same error on direct-invoke as {success:false}', async () => {
      isMemoryEnabledForUserMock.mockResolvedValue(true);
      const adapter = directInvokeAdapter(buildApp());

      const mismatchedPayload = JSON.stringify({
        ownerUuid: 'someoneElse',
        eventType: 'chat-completed',
      });
      const event = buildDirectInvokeEvent('enqueueMemoryEvent', {
        userUuid: 'me',
        payload: mismatchedPayload,
      });
      const result = (await adapter(event, buildLambdaContext())) as {
        success: boolean;
        error: string;
      };

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/ownerUuid must match authenticated user/);
    });
  });

  describe('Malformed payload', () => {
    it('errorBoundary catches JSON.parse failure on direct-invoke', async () => {
      isMemoryEnabledForUserMock.mockResolvedValue(true);
      const adapter = directInvokeAdapter(buildApp());

      const event = buildDirectInvokeEvent('enqueueMemoryEvent', {
        userUuid: 'user-1',
        payload: 'not-json',
      });
      const result = (await adapter(event, buildLambdaContext())) as {
        success: boolean;
        error: string;
      };

      expect(result.success).toBe(false);
      // Node's JSON.parse throws SyntaxError; message varies by Node version.
      expect(result.error.length).toBeGreaterThan(0);
      expect(publishMemoryEventMock).not.toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('400 on missing userUuid', async () => {
      const adapter = directInvokeAdapter(buildApp());

      const event = buildDirectInvokeEvent('enqueueMemoryEvent', { payload: validPayload });
      const result = (await adapter(event, buildLambdaContext())) as {
        success: boolean;
        status: number;
      };

      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(isMemoryEnabledForUserMock).not.toHaveBeenCalled();
    });

    it('400 on missing payload', async () => {
      const adapter = directInvokeAdapter(buildApp());

      const event = buildDirectInvokeEvent('enqueueMemoryEvent', { userUuid: 'user-1' });
      const result = (await adapter(event, buildLambdaContext())) as {
        success: boolean;
        status: number;
      };

      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
    });
  });

  describe('Happy path', () => {
    it('publishes the parsed event and returns {success:true, skipped:false}', async () => {
      isMemoryEnabledForUserMock.mockResolvedValue(true);
      publishMemoryEventMock.mockResolvedValue(undefined);
      const adapter = appsyncAdapter(buildApp());

      const event = buildAppSyncEvent({
        fieldName: 'enqueueMemoryEvent',
        args: { userUuid: 'user-1', payload: validPayload },
        identity: buildCognitoIdentity({ sub: 'user-1' }),
      });
      const result = await adapter(event, buildLambdaContext());

      expect(publishMemoryEventMock).toHaveBeenCalledExactlyOnceWith({
        ownerUuid: 'user-1',
        eventType: 'chat-completed',
        chatUuid: 'chat-1',
      });
      expect(result).toEqual({ success: true, skipped: false });
    });
  });
});
