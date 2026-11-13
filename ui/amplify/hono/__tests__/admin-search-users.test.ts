/**
 * Unit tests for the `adminSearchUsers` route (P2-1).
 *
 * Injects a fake `CognitoIdentityProviderClient.send` to avoid hitting AWS.
 * Verifies the admin-only invocation-type guard and the user-mapping logic.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import {
  ListUsersCommand,
  type CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';

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
import {
  createAdminSearchUsersRoute,
  type UserSummary,
} from '../routes/admin-search-users';

interface CognitoMockSendResult {
  Users?: Array<{
    Enabled?: boolean;
    UserStatus?: string;
    Attributes?: Array<{ Name?: string; Value?: string }>;
  }>;
}

function buildCognito(result: CognitoMockSendResult) {
  const sendMock = vi.fn<(cmd: unknown) => Promise<CognitoMockSendResult>>().mockResolvedValue(result);
  return {
    send: sendMock,
  } as unknown as CognitoIdentityProviderClient;
}

function buildApp(cognito: CognitoIdentityProviderClient, userPoolId = 'us-east-1_TEST') {
  const app = new Hono<HonoEnv>();
  app.onError(errorBoundary);
  app.use('*', authIdentity);
  const route = createAdminSearchUsersRoute({ cognito, userPoolId });
  app.post('/adminSearchUsers', route.validate, route.handler);
  return app;
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('adminSearchUsers route (P2-1)', () => {
  it('returns mapped UserSummary list on AppSync invocation', async () => {
    const cognito = buildCognito({
      Users: [
        {
          Enabled: true,
          UserStatus: 'CONFIRMED',
          Attributes: [
            { Name: 'sub', Value: 'sub-1' },
            { Name: 'email', Value: 'alice@example.com' },
            { Name: 'given_name', Value: 'Alice' },
            { Name: 'family_name', Value: 'Adams' },
          ],
        },
        {
          Enabled: false,
          UserStatus: 'UNCONFIRMED',
          Attributes: [
            { Name: 'sub', Value: 'sub-2' },
            { Name: 'email', Value: 'bob@example.com' },
          ],
        },
      ],
    });
    const adapter = appsyncAdapter(buildApp(cognito));

    const event = buildAppSyncEvent({
      fieldName: 'adminSearchUsers',
      args: { email: 'a' },
      identity: buildCognitoIdentity({ sub: 'admin-1', groups: ['admin'] }),
    });
    const result = (await adapter(event, buildLambdaContext())) as {
      success: boolean;
      users: UserSummary[];
    };

    expect(result.success).toBe(true);
    expect(result.users).toEqual([
      {
        userId: 'sub-1',
        email: 'alice@example.com',
        givenName: 'Alice',
        familyName: 'Adams',
        enabled: true,
        status: 'CONFIRMED',
      },
      {
        userId: 'sub-2',
        email: 'bob@example.com',
        givenName: null,
        familyName: null,
        enabled: false,
        status: 'UNCONFIRMED',
      },
    ]);
  });

  it('issues ListUsersCommand with the correct UserPoolId, Filter, and Limit', async () => {
    const cognito = buildCognito({ Users: [] });
    const adapter = appsyncAdapter(buildApp(cognito, 'pool-XYZ'));

    const event = buildAppSyncEvent({
      fieldName: 'adminSearchUsers',
      args: { email: 'foo' },
      identity: buildCognitoIdentity({ sub: 'admin-1', groups: ['admin'] }),
    });
    await adapter(event, buildLambdaContext());

    expect(cognito.send).toHaveBeenCalledOnce();
    const command = (cognito.send as unknown as { mock: { calls: [ListUsersCommand][] } })
      .mock.calls[0][0];
    expect(command).toBeInstanceOf(ListUsersCommand);
    expect(command.input).toEqual({
      UserPoolId: 'pool-XYZ',
      Filter: 'email ^= "foo"',
      Limit: 25,
    });
  });

  it('rejects direct-invoke (admin boundary lives at AppSync)', async () => {
    const cognito = buildCognito({ Users: [] });
    const adapter = directInvokeAdapter(buildApp(cognito));

    const event = buildDirectInvokeEvent('adminSearchUsers', { email: 'a' });
    const result = (await adapter(event, buildLambdaContext())) as {
      success: boolean;
      error: string;
    };

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/requires AppSync invocation/);
    expect(cognito.send).not.toHaveBeenCalled();
  });

  it('400 on missing email (validateBody)', async () => {
    const cognito = buildCognito({ Users: [] });
    const adapter = appsyncAdapter(buildApp(cognito));

    const event = buildAppSyncEvent({
      fieldName: 'adminSearchUsers',
      args: {},
      identity: buildCognitoIdentity({ sub: 'admin-1', groups: ['admin'] }),
    });

    await expect(adapter(event, buildLambdaContext())).rejects.toThrow(/Validation failed/);
    expect(cognito.send).not.toHaveBeenCalled();
  });
});
