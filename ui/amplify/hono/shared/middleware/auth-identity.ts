/**
 * Hono auth-identity middleware.
 *
 * Reads the AppSync `identity` off the synthetic request set by the AppSync
 * adapter, and stashes it on `c.var.identity` for route handlers to use:
 *
 *   const identity = c.var.identity;
 *   if (!identity || identity.claims.sub !== expectedUserUuid) { ... }
 *
 * Also sets `c.var.requestId` and `c.var.invocationType` for downstream
 * middleware (e.g., Sentry, request-logger, error-boundary).
 *
 * For direct-invoke and cron paths, `identity` is `null`. Route handlers
 * that require identity (most do — they enforce `event.identity.claims.sub ===
 * args.userUuid` style checks) MUST guard against this. The migration plan
 * §6.5 #1 notes that the 3 ProcessDocument-direct-invoke routes (`aiChat`,
 * `mockExamsGenerateQuestions`, `generateQuestions`) read `userUuid` from
 * `arguments` instead of identity, so they're already null-tolerant.
 *
 * See `docs/2026-05-27-amplify-to-hono-migration-plan.md` §10.3 P1-7.
 */

import type { MiddlewareHandler } from 'hono';
import type { AppSyncIdentity, AppSyncResolverEvent } from 'aws-lambda';
import type { HonoEnv } from '../types';
import type { InvocationType } from '../event-discriminator';

export const authIdentity: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const headerInvocation = c.req.header('x-invocation-type') as InvocationType | undefined;
  const invocationType: InvocationType = headerInvocation ?? 'appsync';
  c.set('invocationType', invocationType);

  const requestId = c.req.header('x-aws-request-id') ?? '';
  c.set('requestId', requestId);

  let identity: AppSyncIdentity | null = null;
  if (invocationType === 'appsync') {
    const rawReq = c.req.raw as Request & {
      __appsyncEvent?: AppSyncResolverEvent<unknown>;
    };
    if (rawReq.__appsyncEvent && rawReq.__appsyncEvent.identity) {
      identity = rawReq.__appsyncEvent.identity ?? null;
    }
  }
  c.set('identity', identity);

  await next();
};
