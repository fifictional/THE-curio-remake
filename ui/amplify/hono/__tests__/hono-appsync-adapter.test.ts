import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';

import { appsyncAdapter, resolveAppSyncRoute } from '../shared/hono-appsync-adapter';
import { authIdentity } from '../shared/middleware/auth-identity';
import { errorBoundary } from '../shared/middleware/error-boundary';
import { buildAppSyncEvent, buildAmplifyFunctionHandlerEvent, buildCognitoIdentity, buildLambdaContext } from '../shared/test-utils';
import type { HonoEnv } from '../shared/types';

describe('resolveAppSyncRoute', () => {
  it('routes standard fields to /<fieldName>', () => {
    expect(resolveAppSyncRoute('aiChat', {})).toBe('/aiChat');
    expect(resolveAppSyncRoute('deleteChat', {})).toBe('/deleteChat');
  });

  it('routes action-dispatcher fields to /<fieldName>/<actionType>', () => {
    expect(resolveAppSyncRoute('knowledgeBaseQuery', { actionType: 'listSubjects' })).toBe(
      '/knowledgeBaseQuery/listSubjects',
    );
    expect(resolveAppSyncRoute('learningProfileMutation', { actionType: 'createOrUpdateConceptMastery' })).toBe(
      '/learningProfileMutation/createOrUpdateConceptMastery',
    );
  });

  it('routes legacy aliases to canonical /<fieldName>/<actionType>', () => {
    expect(resolveAppSyncRoute('createOrUpdateConceptMastery', {})).toBe(
      '/learningProfileMutation/createOrUpdateConceptMastery',
    );
    expect(resolveAppSyncRoute('getUserLearningProfile', {})).toBe(
      '/learningProfileQuery/getUserLearningProfile',
    );
  });

  it('throws when action-dispatcher field is missing actionType', () => {
    expect(() => resolveAppSyncRoute('knowledgeBaseQuery', {})).toThrow(/missing required arguments.actionType/);
    expect(() => resolveAppSyncRoute('learningProfileQuery', null)).toThrow(/missing required arguments.actionType/);
  });
});

describe('appsyncAdapter', () => {
  function buildAppWithRoute(handler: (c: import('hono').Context<HonoEnv>) => Response | Promise<Response>) {
    const app = new Hono<HonoEnv>();
    app.onError(errorBoundary);
    app.use('*', authIdentity);
    app.post('/echo', handler);
    app.post('/knowledgeBaseQuery/listSubjects', handler);
    return app;
  }

  it('dispatches a standard AppSync event to the matching Hono route and returns its JSON body', async () => {
    const app = buildAppWithRoute((c) => c.json({ ok: true, route: c.req.path, method: c.req.method }));
    const adapter = appsyncAdapter(app);

    const event = buildAppSyncEvent({
      fieldName: 'echo',
      args: { hello: 'world' },
      identity: buildCognitoIdentity(),
    });
    const result = await adapter(event, buildLambdaContext());

    expect(result).toEqual({ ok: true, route: '/echo', method: 'POST' });
  });

  it('dispatches Amplify Gen 2 flattened handler events to the matching route', async () => {
    const app = buildAppWithRoute((c) => c.json({ ok: true, route: c.req.path }));
    const adapter = appsyncAdapter(app);

    const event = buildAmplifyFunctionHandlerEvent({
      fieldName: 'echo',
      args: { hello: 'world' },
    });
    const result = await adapter(event, buildLambdaContext());

    expect(result).toEqual({ ok: true, route: '/echo' });
  });

  it('exposes the AppSync identity to route handlers via c.var.identity', async () => {
    const app = buildAppWithRoute((c) => {
      const identity = c.var.identity;
      const sub = identity && typeof identity === 'object' && 'sub' in identity ? identity.sub : null;
      return c.json({ sub });
    });
    const adapter = appsyncAdapter(app);

    const event = buildAppSyncEvent({
      fieldName: 'echo',
      identity: buildCognitoIdentity({ sub: 'user-42' }),
    });
    const result = (await adapter(event, buildLambdaContext())) as { sub: string };

    expect(result.sub).toBe('user-42');
  });

  it('marks invocationType as appsync', async () => {
    const app = buildAppWithRoute((c) => c.json({ invocationType: c.var.invocationType }));
    const adapter = appsyncAdapter(app);

    const event = buildAppSyncEvent({ fieldName: 'echo' });
    const result = (await adapter(event, buildLambdaContext())) as { invocationType: string };

    expect(result.invocationType).toBe('appsync');
  });

  it('routes action-dispatcher fields including actionType', async () => {
    const app = buildAppWithRoute((c) => c.json({ ok: true, route: c.req.path }));
    const adapter = appsyncAdapter(app);

    const event = buildAppSyncEvent({
      fieldName: 'knowledgeBaseQuery',
      args: { actionType: 'listSubjects' },
    });
    const result = await adapter(event, buildLambdaContext());

    expect(result).toEqual({ ok: true, route: '/knowledgeBaseQuery/listSubjects' });
  });

  it('throws when an unknown Hono route is invoked (so AppSync surfaces a GraphQL error)', async () => {
    const app = new Hono<HonoEnv>();
    app.onError(errorBoundary);
    app.use('*', authIdentity);
    // No matching route registered
    const adapter = appsyncAdapter(app);

    const event = buildAppSyncEvent({ fieldName: 'missingField' });
    await expect(adapter(event, buildLambdaContext())).rejects.toThrow(/missingField/);
  });

  it('throws with the route handler error message when a route throws', async () => {
    const app = buildAppWithRoute(() => {
      throw new Error('boom from route');
    });
    const adapter = appsyncAdapter(app);

    const event = buildAppSyncEvent({ fieldName: 'echo' });
    await expect(adapter(event, buildLambdaContext())).rejects.toThrow(/boom from route/);
  });
});
