/**
 * Regression tests for polymorphic dispatch — especially Amplify Gen 2's
 * flattened AppSync handler event (`{ typeName, fieldName, arguments }`).
 *
 * Live AppSync → Hono Lambdas use this shape; unit tests historically used
 * nested `info.fieldName` only, which hid the production-only failure mode.
 */

import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';

import { buildPolymorphicHandler } from '../shared/polymorphic-dispatcher';
import {
  buildAmplifyFunctionHandlerEvent,
  buildAppSyncEvent,
  buildDirectInvokeEvent,
  buildScheduledEvent,
  invokePolymorphicHandler,
} from '../shared/test-utils';
import { authIdentity } from '../shared/middleware/auth-identity';
import { errorBoundary } from '../shared/middleware/error-boundary';
import type { HonoEnv } from '../shared/types';

function buildEchoApp() {
  const app = new Hono<HonoEnv>();
  app.onError(errorBoundary);
  app.use('*', authIdentity);
  app.post('/echo', (c) => c.json({ ok: true, path: c.req.path }));
  app.post('/runMemoryBackfill', (c) => c.json({ success: true, routed: true }));
  app.post('/knowledgeBaseQuery/listSubjects', (c) =>
    c.json({ success: true, action: 'listSubjects' }),
  );
  return app;
}

describe('buildPolymorphicHandler', () => {
  const handler = buildPolymorphicHandler(buildEchoApp());

  it('routes nested AppSyncResolverEvent (test helper shape)', async () => {
    const event = buildAppSyncEvent({ fieldName: 'echo', args: {} });
    const result = await invokePolymorphicHandler(handler, event);
    expect(result).toEqual({ ok: true, path: '/echo' });
  });

  it('routes Amplify Gen 2 flattened handler events (live sandbox shape)', async () => {
    const event = buildAmplifyFunctionHandlerEvent({
      typeName: 'Mutation',
      fieldName: 'runMemoryBackfill',
      args: { userUuid: 'user-1' },
    });
    const result = await invokePolymorphicHandler(handler, event);
    expect(result).toEqual({ success: true, routed: true });
  });

  it('routes flattened events without typeName (defensive)', async () => {
    const event = {
      fieldName: 'echo',
      arguments: {},
      identity: null,
      source: null,
      request: { headers: {}, domainName: null },
      prev: null,
    };
    const result = await invokePolymorphicHandler(handler, event);
    expect(result).toEqual({ ok: true, path: '/echo' });
  });

  it('routes action-dispatcher fields from flattened events', async () => {
    const event = buildAmplifyFunctionHandlerEvent({
      typeName: 'Query',
      fieldName: 'knowledgeBaseQuery',
      args: { actionType: 'listSubjects' },
    });
    const result = await invokePolymorphicHandler(handler, event);
    expect(result).toEqual({ success: true, action: 'listSubjects' });
  });

  it('routes direct-invoke payloads unchanged', async () => {
    const event = buildDirectInvokeEvent('echo', {});
    const result = await invokePolymorphicHandler(handler, event);
    expect(result).toEqual({ ok: true, path: '/echo' });
  });

  it('routes EventBridge scheduled events to batch-creator path', async () => {
    const app = new Hono<HonoEnv>();
    app.onError(errorBoundary);
    app.use('*', authIdentity);
    app.post('/__cron/batch-creator', (c) => c.json({ cron: true }));
    const cronHandler = buildPolymorphicHandler(app);

    const event = buildScheduledEvent({
      detail: { arguments: { jobType: 'chat-summary-embed' } },
    });
    const result = await invokePolymorphicHandler(cronHandler, event);
    expect(result).toEqual({ cron: true });
  });

  it('throws for AppSync-like payloads that still cannot be classified', async () => {
    await expect(
      invokePolymorphicHandler(handler, {
        typeName: 'Mutation',
        fieldName: '',
        arguments: {},
      }),
    ).rejects.toThrow(/Unrecognized AppSync handler event/);
  });

  it('returns structured failure for truly unknown payloads (no fieldName)', async () => {
    const result = await invokePolymorphicHandler(handler, { foo: 'bar' });
    expect(result).toEqual({
      success: false,
      error: expect.stringContaining('Unknown event shape'),
    });
  });
});
