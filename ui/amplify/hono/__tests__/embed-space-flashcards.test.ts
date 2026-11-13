/**
 * Unit tests for `embedSpaceFlashcards` route (P3-5).
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
import { createEmbedSpaceFlashcardsRoute } from '../routes/embed-space-flashcards';
import type { HonoDataClient } from '../shared/data-client';

const { embedFlashcardsForSpaceMock } = vi.hoisted(() => ({
  embedFlashcardsForSpaceMock: vi.fn(),
}));

vi.mock('../../utils/embed-space-flashcards', () => ({
  embedFlashcardsForSpace: embedFlashcardsForSpaceMock,
}));

function buildApp(client: HonoDataClient) {
  const app = new Hono<HonoEnv>();
  app.onError(errorBoundary);
  app.use('*', authIdentity);
  const route = createEmbedSpaceFlashcardsRoute(client);
  app.post('/embedSpaceFlashcards', route.validate, route.handler);
  return app;
}

const client = {} as HonoDataClient;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('embedSpaceFlashcards route (P3-5)', () => {
  it('returns embedded count via AppSync', async () => {
    embedFlashcardsForSpaceMock.mockResolvedValue({ embedded: 5 });
    const app = buildApp(client);
    const event = buildAppSyncEvent({
      fieldName: 'embedSpaceFlashcards',
      args: { spaceUuid: 'space-1', userUuid: 'user-1' },
      identity: buildCognitoIdentity(),
      parentTypeName: 'Mutation',
    });

    const result = await appsyncAdapter(app)(event, buildLambdaContext());

    expect(result).toEqual({ success: true, embedded: 5 });
    expect(embedFlashcardsForSpaceMock).toHaveBeenCalledWith(
      client,
      'space-1',
      'user-1',
    );
  });

  it('accepts legacy top-level args shape (moveDocument invoke parity)', async () => {
    embedFlashcardsForSpaceMock.mockResolvedValue({ embedded: 2 });
    const app = buildApp(client);

    const response = await app.request('https://hono-internal.local/embedSpaceFlashcards', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-invocation-type': 'direct',
      },
      body: JSON.stringify({ spaceUuid: 'space-2', userUuid: 'user-2' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, embedded: 2 });
  });

  it('returns success:false when args missing (does not throw)', async () => {
    const app = buildApp(client);
    const event = buildAppSyncEvent({
      fieldName: 'embedSpaceFlashcards',
      args: { spaceUuid: 'space-1' },
      identity: buildCognitoIdentity(),
      parentTypeName: 'Mutation',
    });

    const result = await appsyncAdapter(app)(event, buildLambdaContext());

    expect(result).toEqual({
      success: false,
      error: 'spaceUuid and userUuid required',
    });
    expect(embedFlashcardsForSpaceMock).not.toHaveBeenCalled();
  });

  it('returns success:false on embed error (does not throw)', async () => {
    embedFlashcardsForSpaceMock.mockRejectedValue(new Error('OpenSearch down'));
    const app = buildApp(client);
    const event = buildDirectInvokeEvent('embedSpaceFlashcards', {
      spaceUuid: 'space-1',
      userUuid: 'user-1',
    });

    const result = await directInvokeAdapter(app)(event, buildLambdaContext());

    expect(result).toEqual({ success: false, error: 'OpenSearch down' });
  });
});
