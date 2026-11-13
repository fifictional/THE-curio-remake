/**
 * Unit tests for the `moveAllUserResources` route (P3-3).
 *
 * Builds a fake data client with stubbed Document/Chat/Space model methods.
 * Verifies bulk move-to-no-folder + count return shape + required-arg
 * validation.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

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
import { createMoveAllUserResourcesRoute } from '../routes/move-all-user-resources';
import type { HonoDataClient } from '../shared/data-client';

function buildClient(overrides: {
  documents?: Array<{ documentUuid: string }>;
  chats?: Array<{ chatUuid: string }>;
}) {
  const docList = vi.fn().mockResolvedValue({ data: overrides.documents ?? [] });
  const docUpdate = vi.fn().mockResolvedValue({ data: {} });
  const chatList = vi.fn().mockResolvedValue({ data: overrides.chats ?? [] });
  const chatUpdate = vi.fn().mockResolvedValue({ data: {} });
  const spaceUpdate = vi.fn().mockResolvedValue({ data: {} });

  const client = {
    models: {
      Document: {
        listDocumentBySpaceUuidAndCreatedAt: docList,
        update: docUpdate,
      },
      Chat: {
        listChatBySpaceUuidAndCreatedAt: chatList,
        update: chatUpdate,
      },
      Space: { update: spaceUpdate },
    },
  } as unknown as HonoDataClient;

  return { client, docList, docUpdate, chatList, chatUpdate, spaceUpdate };
}

function buildApp(client: HonoDataClient) {
  const app = new Hono<HonoEnv>();
  app.onError(errorBoundary);
  app.use('*', authIdentity);
  const route = createMoveAllUserResourcesRoute(client);
  app.post('/moveAllUserResources', route.validate, route.handler);
  return app;
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('moveAllUserResources route (P3-3)', () => {
  it('moves all docs + chats to no-folder and returns counts', async () => {
    const { client, docUpdate, chatUpdate, spaceUpdate } = buildClient({
      documents: [{ documentUuid: 'd1' }, { documentUuid: 'd2' }],
      chats: [{ chatUuid: 'c1' }],
    });
    const adapter = appsyncAdapter(buildApp(client));

    const event = buildAppSyncEvent({
      fieldName: 'moveAllUserResources',
      args: { userUuid: 'u1', spaceUuid: 'space-1' },
      identity: buildCognitoIdentity(),
    });
    const result = (await adapter(event, buildLambdaContext())) as {
      documentsMoved: number;
      chatsMoved: number;
    };

    expect(result).toEqual({ documentsMoved: 2, chatsMoved: 1 });
    expect(docUpdate).toHaveBeenCalledTimes(2);
    expect(docUpdate).toHaveBeenCalledWith(
      { documentUuid: 'd1', spaceUuid: null },
      expect.anything(),
    );
    expect(chatUpdate).toHaveBeenCalledWith(
      { chatUuid: 'c1', spaceUuid: null },
      expect.anything(),
    );
    expect(spaceUpdate).toHaveBeenCalledTimes(1);
  });

  it('returns zero counts when nothing matches', async () => {
    const { client, spaceUpdate } = buildClient({ documents: [], chats: [] });
    const adapter = directInvokeAdapter(buildApp(client));

    const event = buildDirectInvokeEvent('moveAllUserResources', {
      userUuid: 'u1',
      spaceUuid: 'space-1',
    });
    const result = (await adapter(event, buildLambdaContext())) as {
      documentsMoved: number;
      chatsMoved: number;
    };

    expect(result).toEqual({ documentsMoved: 0, chatsMoved: 0 });
    // space still fake-updated to refresh counts
    expect(spaceUpdate).toHaveBeenCalledTimes(1);
  });

  it('400 on missing userUuid', async () => {
    const { client } = buildClient({});
    const adapter = directInvokeAdapter(buildApp(client));

    const event = buildDirectInvokeEvent('moveAllUserResources', { spaceUuid: 'space-1' });
    const result = (await adapter(event, buildLambdaContext())) as {
      success: boolean;
      status: number;
    };

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
  });

  it('400 on missing spaceUuid', async () => {
    const { client } = buildClient({});
    const adapter = directInvokeAdapter(buildApp(client));

    const event = buildDirectInvokeEvent('moveAllUserResources', { userUuid: 'u1' });
    const result = (await adapter(event, buildLambdaContext())) as {
      success: boolean;
      status: number;
    };

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
  });
});
