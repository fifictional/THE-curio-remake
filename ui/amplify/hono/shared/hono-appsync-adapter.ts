/**
 * AppSync resolver → Hono adapter.
 *
 * Converts an `AppSyncResolverEvent` into a synthetic `Request`, runs it
 * through the Hono app, then unwraps the `Response` back into a value
 * AppSync's Lambda data source can return.
 *
 * Routing rules (see `docs/migration-baselines/neptune-actions-2026-05-28.md`):
 *
 *   - Standard ops: `POST /<fieldName>` (e.g., `POST /aiChat`, `POST /deleteChat`).
 *   - Action-dispatcher ops (Neptune): `POST /<fieldName>/<actionType>`
 *     (e.g., `POST /knowledgeBaseMutation/createSubject`).
 *   - Legacy aliases (`neptuneLearningProfile` only): mapped to their
 *     canonical actionType route by an explicit alias table.
 *
 * The body of the synthetic request is `event.arguments` JSON-encoded.
 * The `info.fieldName`, full `event.identity`, and Lambda `requestId` are
 * passed to the Hono app via headers (`x-appsync-field`, `x-aws-request-id`)
 * for middleware to consume.
 *
 * See `docs/2026-05-27-amplify-to-hono-migration-plan.md` §10.3 P1-2.
 */

import type { Hono } from 'hono';
import type { AppSyncResolverEvent, Context } from 'aws-lambda';
import { normalizeAppSyncEvent, type AppSyncLikeEvent } from './event-discriminator';
import type { HonoEnv } from './types';

/**
 * Legacy fieldName → canonical actionType route mapping for
 * `neptuneLearningProfile`. Each of the 6 aliases is a fieldName that older
 * clients use directly without the `learningProfileQuery|Mutation` wrapper.
 *
 * Captured in PF-7 baseline. After Phase 5 stable for 1 week, check
 * CloudWatch invocation metrics per legacy fieldName and remove the alias
 * if zero traffic. See `docs/migration-baselines/neptune-actions-2026-05-28.md` §4.
 */
const LEARNING_PROFILE_LEGACY_ALIASES: Record<string, string> = {
  createOrUpdateConceptMastery: 'learningProfileMutation/createOrUpdateConceptMastery',
  getUserLearningProfile: 'learningProfileQuery/getUserLearningProfile',
  getConceptMastery: 'learningProfileQuery/getConceptMastery',
  getTopicMastery: 'learningProfileQuery/getTopicMastery',
  getSubtopicMastery: 'learningProfileQuery/getSubtopicMastery',
  batchUpdateConceptMastery: 'learningProfileMutation/batchUpdateConceptMastery',
};

/**
 * fieldNames that follow the action-dispatcher pattern. For these, the
 * adapter appends `/{actionType}` to the route path.
 *
 * MUST stay in sync with the Neptune handlers' dispatch logic (PF-7).
 */
const ACTION_DISPATCHER_FIELDS = new Set([
  'knowledgeBaseQuery',
  'knowledgeBaseMutation',
  'learningProfileQuery',
  'learningProfileMutation',
]);

/**
 * Build the Hono route path for a given AppSync event.
 *
 * Public so unit tests + the direct-invoke adapter can use the same logic.
 */
export function resolveAppSyncRoute(
  fieldName: string,
  args: Record<string, unknown> | undefined | null,
): string {
  if (fieldName in LEARNING_PROFILE_LEGACY_ALIASES) {
    return `/${LEARNING_PROFILE_LEGACY_ALIASES[fieldName]}`;
  }
  if (ACTION_DISPATCHER_FIELDS.has(fieldName)) {
    const actionType = args && typeof args.actionType === 'string' ? args.actionType : '';
    if (!actionType) {
      throw new Error(
        `AppSync event for "${fieldName}" missing required arguments.actionType; ` +
          `cannot route to a Hono route.`,
      );
    }
    return `/${fieldName}/${actionType}`;
  }
  return `/${fieldName}`;
}

/**
 * Build the AppSync handler from a Hono app.
 *
 * The returned handler can be wired to the `handler` export of any Hono
 * Lambda. It calls into the polymorphic dispatcher (`P1-15`) once we have
 * one; until then it can be used directly for AppSync-only Lambdas in
 * tests.
 */
export function appsyncAdapter(app: Hono<HonoEnv>) {
  return async (event: AppSyncLikeEvent, context: Context): Promise<unknown> => {
    const normalized = normalizeAppSyncEvent(event);
    const fieldName = normalized.info.fieldName;
    const args = (normalized.arguments ?? {}) as Record<string, unknown>;
    const path = resolveAppSyncRoute(fieldName, args);
    const url = `https://hono-internal.local${path}`;

    const request = new Request(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-appsync-field': fieldName,
        'x-aws-request-id': context.awsRequestId,
        'x-invocation-type': 'appsync',
      },
      body: JSON.stringify(args),
    });

    // Stash the raw AppSync event on the request so auth-identity middleware
    // can read identity without re-parsing. Hono's Request is a plain Web
    // Request so we attach via a side-channel symbol-keyed property.
    (request as unknown as { __appsyncEvent: AppSyncResolverEvent<unknown> }).__appsyncEvent =
      normalized;

    const response = await app.fetch(request, {
      // No env bindings yet; HonoEnv['Bindings'] is empty
    });

    // AppSync expects the resolved JSON value as the return — NOT a Response
    // object. We need to read response.json() and pass through. If the route
    // returned non-2xx, surface as an error so AppSync raises a GraphQL
    // error to the client.
    const body = await response.json().catch(() => ({}));

    if (response.status >= 400) {
      const errorMessage =
        (body && typeof body === 'object' && 'error' in body
          ? String((body as { error: unknown }).error)
          : '') || `Hono route ${path} returned status ${response.status}`;
      const err = new Error(errorMessage);
      // Attach original status for downstream observability
      (err as Error & { honoStatus?: number }).honoStatus = response.status;
      throw err;
    }

    return body;
  };
}
