/**
 * Unit tests for the `deleteChat` route (P2-7).
 *
 * Mocks the existing shared helper `deleteChatData` so we don't need a real
 * AppSync data client. Mirrors the existing handler contract — see
 * `amplify/functions/delete-chat/handler.ts` + `amplify/data/resource.ts:1072-1079`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

// vi.mock factories are hoisted ABOVE const declarations in the test body, so
// any mock that references a value directly (rather than via a closure like
// `.mockImplementation(() => ...)`) must declare that value inside vi.hoisted.
// See: https://vitest.dev/api/vi.html#vi-hoisted
const { deleteChatDataMock } = vi.hoisted(() => ({
  deleteChatDataMock: vi.fn<(...args: unknown[]) => Promise<void>>(),
}));

vi.mock('../../functions/common/delete-chat', () => ({
  deleteChatData: deleteChatDataMock,
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
import { createDeleteChatRoute } from '../routes/delete-chat';
import type { HonoDataClient } from '../shared/data-client';

const fakeDataClient = {} as HonoDataClient;

function buildApp() {
  const app = new Hono<HonoEnv>();
  app.onError(errorBoundary);
  app.use('*', authIdentity);
  const route = createDeleteChatRoute(fakeDataClient);
  app.post('/deleteChat', route.validate, route.handler);
  return app;
}

beforeEach(() => {
  deleteChatDataMock.mockReset();
});

describe('deleteChat route (P2-7)', () => {
  describe('AppSync path', () => {
    it('deletes the chat and returns true (matches existing Boolean return type)', async () => {
      deleteChatDataMock.mockResolvedValue(undefined);
      const adapter = appsyncAdapter(buildApp());

      const event = buildAppSyncEvent({
        fieldName: 'deleteChat',
        args: { chatUuid: 'chat-1' },
        identity: buildCognitoIdentity(),
      });
      const result = await adapter(event, buildLambdaContext());

      expect(deleteChatDataMock).toHaveBeenCalledOnce();
      // [client, chatUuid, logger] — assert the chatUuid forwarded
      expect(deleteChatDataMock.mock.calls[0][1]).toBe('chat-1');
      expect(result).toBe(true);
    });

    it('throws (GraphQL error) when chatUuid is missing', async () => {
      const adapter = appsyncAdapter(buildApp());

      const event = buildAppSyncEvent({
        fieldName: 'deleteChat',
        args: {},
        identity: buildCognitoIdentity(),
      });

      await expect(adapter(event, buildLambdaContext())).rejects.toThrow(/Validation failed/);
      expect(deleteChatDataMock).not.toHaveBeenCalled();
    });

    it('propagates "Chat not found" from the shared helper', async () => {
      deleteChatDataMock.mockRejectedValue(new Error('Chat not found'));
      const adapter = appsyncAdapter(buildApp());

      const event = buildAppSyncEvent({
        fieldName: 'deleteChat',
        args: { chatUuid: 'missing' },
        identity: buildCognitoIdentity(),
      });

      await expect(adapter(event, buildLambdaContext())).rejects.toThrow(/Chat not found/);
    });
  });

  describe('Direct-invoke path', () => {
    it('returns literal true on success', async () => {
      deleteChatDataMock.mockResolvedValue(undefined);
      const adapter = directInvokeAdapter(buildApp());

      const event = buildDirectInvokeEvent('deleteChat', { chatUuid: 'chat-42' });
      const result = await adapter(event, buildLambdaContext());

      expect(deleteChatDataMock.mock.calls[0][1]).toBe('chat-42');
      expect(result).toBe(true);
    });

    it('returns {success:false, error:"Validation failed", status:400} on invalid args', async () => {
      const adapter = directInvokeAdapter(buildApp());

      const event = buildDirectInvokeEvent('deleteChat', {});
      const result = (await adapter(event, buildLambdaContext())) as {
        success: boolean;
        status: number;
        error: string;
      };

      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error).toMatch(/Validation failed/);
      expect(deleteChatDataMock).not.toHaveBeenCalled();
    });

    it('returns {success:false, error:"Chat not found"} when helper rejects', async () => {
      deleteChatDataMock.mockRejectedValue(new Error('Chat not found'));
      const adapter = directInvokeAdapter(buildApp());

      const event = buildDirectInvokeEvent('deleteChat', { chatUuid: 'missing' });
      const result = (await adapter(event, buildLambdaContext())) as {
        success: boolean;
        error: string;
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('Chat not found');
    });
  });
});
