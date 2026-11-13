/**
 * Event shape discriminators for Hono Lambda polymorphic dispatch.
 *
 * Each of the 3 Hono Lambdas can receive 3 different event shapes:
 *
 *   1. AppSync resolver event   — from a GraphQL query/mutation via a
 *      Lambda data source. Has `info.fieldName`, `arguments`, `identity`.
 *
 *   2. EventBridge scheduled    — cron triggers (today only `batchCreator`
 *      per PF-1 / §4.3). Has `source: 'aws.events'`,
 *      `detail-type: 'Scheduled Event'`. Used by Hono-Heavy only.
 *
 *   3. Direct-invoke            — Lambda → Lambda from the ProcessDocument
 *      dispatcher per PF-1 Option C-lite. Shape:
 *      `{ __route: string, arguments: object }`. No `info`, no `identity`.
 *      Used by Hono-Heavy (`aiChat`, `mockExamsGenerateQuestions`) and
 *      Hono-Neptune (`generateQuestions`).
 *
 * These typeguards live in `shared/` so all 3 Lambda entries can use them
 * symmetrically. They must remain order-sensitive: AppSync events also
 * contain `arguments`, so check `isAppSyncEvent` BEFORE `isDirectInvoke`.
 *
 * See `docs/2026-05-27-amplify-to-hono-migration-plan.md` §10.3 P1-1.
 */

import type { AppSyncResolverEvent, EventBridgeEvent } from 'aws-lambda';

export type ScheduledEvent = EventBridgeEvent<'Scheduled Event', Record<string, unknown>>;

/** Custom EventBridge target input for batchCreator cron (see backend.ts chatSummaryRule). */
export interface BatchCreatorCronEvent {
  arguments: {
    jobType?: string;
    jobName?: string;
  };
}

/**
 * Direct-invoke payload from the ProcessDocument dispatcher (PF-1 Option C-lite).
 * Future direct-invoke producers (e.g., other Lambdas calling Hono routes)
 * must conform to this shape. `__route` MUST be set; the adapter will reject
 * payloads where it's missing.
 */
export interface DirectInvokeEvent<TArgs = unknown> {
  __route: string;
  arguments: TArgs;
}

/**
 * Amplify Gen 2 custom query/mutation handler event (flattened AppSync shape).
 *
 * Live Lambdas wired via `a.handler.function(...)` receive this shape — top-level
 * `fieldName` / `typeName` — NOT the nested `info.fieldName` of a raw
 * AppSyncResolverEvent. Our unit-test helpers use the nested shape; both must
 * be accepted or every Hono AppSync route silently returns `{ success: false }`.
 */
export interface AmplifyFunctionHandlerEvent<TArgs = Record<string, unknown>> {
  typeName?: string;
  fieldName: string;
  arguments: TArgs;
  identity?: AppSyncResolverEvent<TArgs>['identity'];
  source?: unknown;
  request?: AppSyncResolverEvent<TArgs>['request'];
  prev?: unknown;
}

/** Nested AppSyncResolverEvent or Amplify Gen 2 flattened handler event. */
export type AppSyncLikeEvent<TArgs extends Record<string, unknown> = Record<string, unknown>> =
  | AppSyncResolverEvent<TArgs>
  | AmplifyFunctionHandlerEvent<TArgs>;

function hasTopLevelFieldName(event: Record<string, unknown>): boolean {
  return typeof event.fieldName === 'string' && event.fieldName.length > 0;
}

function hasNestedFieldName(event: Record<string, unknown>): boolean {
  const info = event.info;
  if (!info || typeof info !== 'object') return false;
  const fieldName = (info as Record<string, unknown>).fieldName;
  return typeof fieldName === 'string' && fieldName.length > 0;
}

export function isAmplifyFunctionHandlerEvent(
  event: unknown,
): event is AmplifyFunctionHandlerEvent<Record<string, unknown>> {
  if (!event || typeof event !== 'object') return false;
  const e = event as Record<string, unknown>;
  // Amplify Gen 2 always sends typeName in production; keep it optional so a
  // partial payload still routes instead of falling through to unknown-event.
  return (
    hasTopLevelFieldName(e) &&
    'arguments' in e &&
    typeof e.arguments === 'object' &&
    e.arguments !== null &&
    !hasNestedFieldName(e)
  );
}

export function isAppSyncEvent(
  event: unknown,
): event is AppSyncResolverEvent<Record<string, unknown>> {
  if (!event || typeof event !== 'object') return false;
  const e = event as Record<string, unknown>;
  return hasNestedFieldName(e) || isAmplifyFunctionHandlerEvent(event);
}

/**
 * Normalize either AppSync event shape into a canonical AppSyncResolverEvent
 * so adapters/middleware can always read `event.info.fieldName`.
 */
export function normalizeAppSyncEvent<TArgs extends Record<string, unknown>>(
  event: AppSyncLikeEvent<TArgs>,
): AppSyncResolverEvent<TArgs> {
  if (hasNestedFieldName(event as unknown as Record<string, unknown>)) {
    return event as AppSyncResolverEvent<TArgs>;
  }

  const flat = event as AmplifyFunctionHandlerEvent<TArgs>;
  const fieldName = flat.fieldName;
  const typeName = flat.typeName;
  const parentTypeName =
    typeName === 'Query' || typeName === 'Mutation' || typeName === 'Subscription'
      ? typeName
      : 'Mutation';

  return {
    arguments: flat.arguments ?? ({} as TArgs),
    identity: flat.identity ?? null,
    source: flat.source ?? null,
    request: flat.request ?? { headers: {}, domainName: null },
    info: {
      fieldName,
      parentTypeName,
      variables: {},
      selectionSetList: [],
      selectionSetGraphQL: `{ ${fieldName} }`,
    },
    prev: flat.prev ?? null,
    stash: {},
  } as AppSyncResolverEvent<TArgs>;
}

export function isScheduledEvent(event: unknown): event is ScheduledEvent {
  if (!event || typeof event !== 'object') return false;
  const e = event as Record<string, unknown>;
  return e.source === 'aws.events' && e['detail-type'] === 'Scheduled Event';
}

export function isBatchCreatorCronEvent(
  event: unknown,
): event is BatchCreatorCronEvent {
  if (!event || typeof event !== 'object') return false;
  if (isAppSyncEvent(event) || isDirectInvoke(event) || isScheduledEvent(event)) {
    return false;
  }
  const e = event as Record<string, unknown>;
  const args = e.arguments;
  if (!args || typeof args !== 'object' || args === null) return false;
  return typeof (args as Record<string, unknown>).jobType === 'string';
}

export function isDirectInvoke<TArgs = unknown>(
  event: unknown,
): event is DirectInvokeEvent<TArgs> {
  if (!event || typeof event !== 'object') return false;
  const e = event as Record<string, unknown>;
  if (typeof e.__route !== 'string' || e.__route.length === 0) return false;
  if (!('arguments' in e) || typeof e.arguments !== 'object' || e.arguments === null) {
    return false;
  }
  return true;
}

export type InvocationType = 'appsync' | 'cron' | 'direct';

export function classifyEvent(event: unknown): InvocationType | 'unknown' {
  if (isAppSyncEvent(event)) return 'appsync';
  if (isDirectInvoke(event)) return 'direct';
  if (isScheduledEvent(event)) return 'cron';
  if (isBatchCreatorCronEvent(event)) return 'cron';
  return 'unknown';
}
