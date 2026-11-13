/**
 * Synthetic event + context factories for unit-testing Hono adapters and routes
 * without spinning up a real Lambda.
 *
 * Used by tests under `amplify/hono/__tests__/` and by per-route test files.
 *
 * The shapes mirror what the live runtime produces:
 *  - `buildAppSyncEvent` matches `AppSyncResolverEvent<TArgs>` (Cognito identity)
 *  - `buildScheduledEvent` matches `EventBridgeEvent<'Scheduled Event', ...>`
 *  - `buildDirectInvokeEvent` matches the `DirectInvokeEvent<TArgs>` shape from
 *    `event-discriminator.ts` (used by ProcessDocument dispatcher per PF-1).
 *
 * `buildLambdaContext` returns a minimal `Context` (only fields the adapters
 * read are populated; everything else is no-op).
 */

import type {
  AppSyncIdentityCognito,
  AppSyncResolverEvent,
  Context as LambdaContext,
  EventBridgeEvent,
} from 'aws-lambda';

import type { DirectInvokeEvent, AmplifyFunctionHandlerEvent } from './event-discriminator';

interface AppSyncEventOptions<TArgs> {
  fieldName: string;
  args?: TArgs;
  parentTypeName?: 'Query' | 'Mutation' | 'Subscription';
  identity?: AppSyncIdentityCognito | null;
  selectionSetGraphQL?: string;
}

export function buildAppSyncEvent<TArgs extends Record<string, unknown>>(
  options: AppSyncEventOptions<TArgs>,
): AppSyncResolverEvent<TArgs> {
  const {
    fieldName,
    args = {} as TArgs,
    parentTypeName = 'Query',
    identity = null,
    selectionSetGraphQL = `{ ${fieldName} }`,
  } = options;

  return {
    arguments: args,
    identity,
    source: null,
    request: {
      headers: {},
      domainName: null,
    },
    info: {
      fieldName,
      parentTypeName,
      variables: {},
      selectionSetList: [],
      selectionSetGraphQL,
    },
    prev: null,
    stash: {},
  } as AppSyncResolverEvent<TArgs>;
}

interface AmplifyFunctionHandlerEventOptions<TArgs> {
  fieldName: string;
  args?: TArgs;
  typeName?: 'Query' | 'Mutation' | 'Subscription';
  identity?: AppSyncIdentityCognito | null;
}

/** Amplify Gen 2 flattened handler event (live runtime shape). */
export function buildAmplifyFunctionHandlerEvent<TArgs extends Record<string, unknown>>(
  options: AmplifyFunctionHandlerEventOptions<TArgs>,
): AmplifyFunctionHandlerEvent<TArgs> {
  const {
    fieldName,
    args = {} as TArgs,
    typeName = 'Mutation',
    identity = null,
  } = options;

  return {
    typeName,
    fieldName,
    arguments: args,
    identity,
    source: null,
    request: { headers: {}, domainName: null },
    prev: null,
  };
}

interface ScheduledEventOptions {
  source?: string;
  detailType?: 'Scheduled Event';
  detail?: Record<string, unknown>;
  resources?: string[];
}

export function buildScheduledEvent(
  options: ScheduledEventOptions = {},
): EventBridgeEvent<'Scheduled Event', Record<string, unknown>> {
  const {
    source = 'aws.events',
    detailType = 'Scheduled Event',
    detail = {},
    resources = ['arn:aws:events:eu-west-2:123456789012:rule/test-rule'],
  } = options;

  return {
    version: '0',
    id: 'test-event-id',
    'detail-type': detailType,
    source,
    account: '123456789012',
    time: new Date().toISOString(),
    region: 'eu-west-2',
    resources,
    detail,
  };
}

export function buildDirectInvokeEvent<TArgs = Record<string, unknown>>(
  route: string,
  args: TArgs = {} as TArgs,
): DirectInvokeEvent<TArgs> {
  return {
    __route: route,
    arguments: args,
  };
}

interface LambdaContextOptions {
  awsRequestId?: string;
  functionName?: string;
  remainingTimeInMillis?: number;
}

export function buildLambdaContext(options: LambdaContextOptions = {}): LambdaContext {
  const {
    awsRequestId = 'test-request-id',
    functionName = 'test-fn',
    remainingTimeInMillis = 60_000,
  } = options;

  return {
    callbackWaitsForEmptyEventLoop: false,
    functionName,
    functionVersion: '$LATEST',
    invokedFunctionArn: `arn:aws:lambda:eu-west-2:123456789012:function:${functionName}`,
    memoryLimitInMB: '512',
    awsRequestId,
    logGroupName: `/aws/lambda/${functionName}`,
    logStreamName: 'test-stream',
    getRemainingTimeInMillis: () => remainingTimeInMillis,
    done: () => undefined,
    fail: () => undefined,
    succeed: () => undefined,
  };
}

export function buildCognitoIdentity(
  options: Partial<AppSyncIdentityCognito> = {},
): AppSyncIdentityCognito {
  return {
    sub: options.sub ?? 'test-user-sub',
    issuer: options.issuer ?? 'https://cognito-idp.eu-west-2.amazonaws.com/eu-west-2_TEST',
    username: options.username ?? 'test-user',
    claims: options.claims ?? {
      sub: options.sub ?? 'test-user-sub',
      'cognito:groups': ['users'],
    },
    sourceIp: options.sourceIp ?? ['127.0.0.1'],
    defaultAuthStrategy: options.defaultAuthStrategy ?? 'ALLOW',
    groups: options.groups ?? ['users'],
  };
}

/** Invoke a polymorphic Hono Lambda handler in tests (promise style, no callback). */
export async function invokePolymorphicHandler(
  handler: unknown,
  event: unknown,
  context: LambdaContext = buildLambdaContext(),
): Promise<unknown> {
  return (handler as (e: unknown, c: LambdaContext) => Promise<unknown>)(event, context);
}
