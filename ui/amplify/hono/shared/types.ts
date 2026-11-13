/**
 * Shared Hono types for the Amplify-to-Hono migration.
 *
 * `HonoEnv` is the type fed into every Hono app so middleware and route
 * handlers see the same typed `c.var` (variables) and `c.env` (bindings).
 *
 * See `docs/2026-05-27-amplify-to-hono-migration-plan.md` §10.3 P1-11.
 */

import type { AppSyncIdentity } from 'aws-lambda';
import type { InvocationType } from './event-discriminator';

/**
 * Per-request variables set by middleware. Route handlers read these via
 * `c.var.identity`, `c.var.requestId`, etc.
 *
 * `identity` is `null` for non-AppSync invocations (cron and direct-invoke).
 * Route handlers that require identity context MUST guard against null —
 * the auth-identity middleware doesn't synthesize identity for these paths
 * because they have no caller-context to derive it from.
 */
export interface HonoVariables {
  /**
   * AppSync caller identity. Populated by `middleware/auth-identity.ts` when
   * the invocation is `appsync`. `null` for cron and direct-invoke paths.
   */
  identity: AppSyncIdentity | null;

  /**
   * Stable per-invocation ID. Today set to the Lambda awsRequestId by the
   * adapter; routes can override for nested ops if needed.
   */
  requestId: string;

  /**
   * Tag for which adapter routed this request. Lets middleware/handlers
   * differentiate between AppSync GraphQL, EventBridge cron, and direct
   * Lambda invoke. Drives error-shape (P1-5), Mixpanel skip (P1-9), etc.
   */
  invocationType: InvocationType;
}

/**
 * Hono environment-binding type. Currently no `c.env` is used (we read env
 * vars off `process.env` directly to stay close to the existing Lambda
 * pattern), so `Bindings` is empty. Adding e.g. `KV` bindings later means
 * extending this type.
 */
export interface HonoEnv {
  Variables: HonoVariables;
  Bindings: Record<string, never>;
}
