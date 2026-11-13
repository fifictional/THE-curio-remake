/**
 * `adminSearchUsers` query route — P2-1.
 *
 * Source: `amplify/functions/admin-search-users/handler.ts` (48 LOC).
 *
 * Migration parity:
 *   - **Cognito-only** — no data client. Calls Cognito `ListUsersCommand` with
 *     `Filter: email ^= "<email>"` (prefix match) and `Limit: 25`, same as
 *     original.
 *   - **Returns** `{success:true, users:[UserSummary]}` — preserved exactly.
 *
 * Security: the AppSync schema enforces `allow.groups(['admin'])` (see
 * `amplify/data/resource.ts:1392`). AppSync rejects non-admin callers BEFORE
 * Lambda invocation. The Lambda itself has no group check.
 *
 * **Direct-invoke is rejected by this route** — there is no caller-identity
 * signal on the direct-invoke path, so any code with `lambda:InvokeFunction`
 * permission on Hono-Light could read all users via Cognito. We refuse
 * direct-invoke explicitly to keep the admin-only boundary intact. This is
 * stricter than the original Lambda (which had no direct-invoke entry point
 * at all) — same effective security.
 *
 * EventBridge cron is also rejected for the same reason.
 *
 * AppSync field shape (from `amplify/data/resource.ts:1383-1393`):
 *
 *   adminSearchUsers(email: String!): { success: Boolean!, users: [UserSummary!]! }
 *
 * Required env: `COGNITO_USER_POOL_ID` (wired in `amplify/backend.ts`).
 * Required IAM: `cognito-idp:ListUsers` on the user-pool ARN (wired in
 * `amplify/backend.ts`).
 *
 * @see docs/2026-05-27-amplify-to-hono-migration-plan.md §10.4 P2-1.
 */

import type { Context, MiddlewareHandler } from 'hono';
import { z } from 'zod';
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';

import {
  getValidatedBody,
  validateBody,
} from '../shared/middleware/validate';
import type { HonoEnv } from '../shared/types';

export const AdminSearchUsersArgs = z.object({
  email: z.string().min(1, 'email is required'),
});

export interface UserSummary {
  userId: string;
  email: string;
  givenName?: string | null;
  familyName?: string | null;
  enabled: boolean;
  status?: string | null;
}

export interface AdminSearchUsersRoute {
  validate: MiddlewareHandler<HonoEnv>;
  handler: (c: Context<HonoEnv>) => Promise<Response>;
}

export interface AdminSearchUsersDeps {
  userPoolId: string;
  cognito?: CognitoIdentityProviderClient;
}

export function createAdminSearchUsersRoute(
  deps: AdminSearchUsersDeps,
): AdminSearchUsersRoute {
  const validate = validateBody(AdminSearchUsersArgs);
  const cognito = deps.cognito ?? new CognitoIdentityProviderClient({});

  const handler = async (c: Context<HonoEnv>): Promise<Response> => {
    // Admin boundary: only AppSync (which already enforced `allow.groups(['admin'])`)
    // is allowed to reach this code. Reject all other invocation types.
    const invocationType = c.var.invocationType;
    if (invocationType !== 'appsync') {
      throw new Error(
        `adminSearchUsers requires AppSync invocation (admin group); got '${invocationType}'`,
      );
    }

    const { email } = getValidatedBody<typeof AdminSearchUsersArgs>(c);

    const command = new ListUsersCommand({
      UserPoolId: deps.userPoolId,
      // Cognito prefix match. Note: `email` is user-supplied; we rely on
      // Cognito to safely handle the value. Original handler used the same
      // shape — preserved for migration parity.
      Filter: `email ^= "${email}"`,
      Limit: 25,
    });
    const response = await cognito.send(command);

    const users: UserSummary[] = (response.Users || []).map((u) => {
      const attrs = new Map(
        (u.Attributes || []).map((a) => [a?.Name || '', a?.Value || '']),
      );
      return {
        userId: attrs.get('sub') || 'Invalid User ID',
        email: attrs.get('email') || '',
        givenName: attrs.get('given_name') || null,
        familyName: attrs.get('family_name') || null,
        enabled: !!u.Enabled,
        status: u.UserStatus || null,
      };
    });

    return c.json({ success: true, users });
  };

  return { validate, handler };
}
