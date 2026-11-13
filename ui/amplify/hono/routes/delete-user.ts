/**
 * `deleteUser` mutation route — P3-13.
 *
 * Source: `amplify/functions/delete-user/handler.ts`
 * Core logic: `run-delete-user.ts`.
 *
 * Authenticated-only mutation (`allow.authenticated()`). Cascading deletes via
 * `common/delete-document.ts` + `common/delete-chat.ts`.
 *
 * AppSync field shape (from `amplify/data/resource.ts:1080-1092`):
 *
 *   deleteUser(userUuid: ID!): { success: Boolean!, message: String }
 *
 * @see docs/2026-05-27-amplify-to-hono-migration-plan.md §10.5 P3-13.
 */

import type { Context, MiddlewareHandler } from 'hono';
import { z } from 'zod';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { S3Client } from '@aws-sdk/client-s3';

import {
  runDeleteUser,
  type DeleteUserDeps,
} from '../../functions/delete-user/run-delete-user';
import type { HonoDataClient } from '../shared/data-client';
import {
  getValidatedBody,
  validateBody,
} from '../shared/middleware/validate';
import type { HonoEnv } from '../shared/types';

export const DeleteUserArgs = z.object({
  userUuid: z.string().min(1, 'userUuid is required'),
});

export interface DeleteUserRoute {
  validate: MiddlewareHandler<HonoEnv>;
  handler: (c: Context<HonoEnv>) => Promise<Response>;
}

export interface DeleteUserRouteDeps {
  s3?: S3Client;
  cognitoClient?: CognitoIdentityProviderClient;
  deleteUserDeps?: Partial<DeleteUserDeps>;
}

function buildDeleteUserDeps(
  overrides: Partial<DeleteUserDeps> = {},
): DeleteUserDeps {
  return {
    s3: overrides.s3 ?? new S3Client({}),
    cognitoClient:
      overrides.cognitoClient ?? new CognitoIdentityProviderClient({}),
    bucketName:
      overrides.bucketName ??
      (process.env.AI_TUTOR_STORAGE_BUCKET_NAME ||
        process.env.AWS_BUCKET_NAME ||
        ''),
    openSearchIndex: overrides.openSearchIndex ?? process.env.OPENSEARCH_INDEX ?? '',
    userPoolId: overrides.userPoolId ?? process.env.COGNITO_USER_POOL_ID,
    logger: overrides.logger,
    getUser: overrides.getUser,
  };
}

export function createDeleteUserRoute(
  client: HonoDataClient,
  deps: DeleteUserRouteDeps = {},
): DeleteUserRoute {
  const validate = validateBody(DeleteUserArgs);
  const deleteDeps = buildDeleteUserDeps({
    s3: deps.s3,
    cognitoClient: deps.cognitoClient,
    ...deps.deleteUserDeps,
  });

  const handler = async (c: Context<HonoEnv>): Promise<Response> => {
    const { userUuid } = getValidatedBody<typeof DeleteUserArgs>(c);
    const result = await runDeleteUser(client, userUuid, deleteDeps);
    return c.json(result);
  };

  return { validate, handler };
}
