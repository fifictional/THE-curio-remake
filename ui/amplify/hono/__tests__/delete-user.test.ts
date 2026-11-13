/**
 * Unit tests for `deleteUser` route (P3-13).
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
import { createDeleteUserRoute } from '../routes/delete-user';
import type { HonoDataClient } from '../shared/data-client';

const { runDeleteUserMock } = vi.hoisted(() => ({
  runDeleteUserMock: vi.fn(),
}));

vi.mock('../../functions/delete-user/run-delete-user', () => ({
  runDeleteUser: runDeleteUserMock,
}));

const client = {} as HonoDataClient;

function buildApp() {
  const app = new Hono<HonoEnv>();
  app.onError(errorBoundary);
  app.use('*', authIdentity);
  const route = createDeleteUserRoute(client, {
    s3: {} as never,
    cognitoClient: {} as never,
    deleteUserDeps: {
      bucketName: 'test-bucket',
      openSearchIndex: 'rag-documents',
      userPoolId: 'pool-1',
    },
  });
  app.post('/deleteUser', route.validate, route.handler);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('deleteUser route (P3-13)', () => {
  it('returns success message when deletion completes', async () => {
    runDeleteUserMock.mockResolvedValue({
      success: true,
      message: 'User and all associated data deleted successfully',
    });
    const app = buildApp();
    const event = buildAppSyncEvent({
      fieldName: 'deleteUser',
      args: { userUuid: 'user-1' },
      identity: buildCognitoIdentity(),
      parentTypeName: 'Mutation',
    });

    const result = await appsyncAdapter(app)(event, buildLambdaContext());

    expect(result).toEqual({
      success: true,
      message: 'User and all associated data deleted successfully',
    });
    expect(runDeleteUserMock).toHaveBeenCalledWith(
      client,
      'user-1',
      expect.objectContaining({
        bucketName: 'test-bucket',
        openSearchIndex: 'rag-documents',
        userPoolId: 'pool-1',
      }),
    );
  });

  it('propagates errors from run module', async () => {
    runDeleteUserMock.mockRejectedValue(new Error('Cognito delete failed'));
    const app = buildApp();
    const event = buildAppSyncEvent({
      fieldName: 'deleteUser',
      args: { userUuid: 'user-1' },
      identity: buildCognitoIdentity(),
      parentTypeName: 'Mutation',
    });

    await expect(
      appsyncAdapter(app)(event, buildLambdaContext()),
    ).rejects.toThrow('Cognito delete failed');
  });
});
