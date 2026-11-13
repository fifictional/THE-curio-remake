import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';

import { directInvokeAdapter } from '../shared/hono-direct-invoke-adapter';
import { authIdentity } from '../shared/middleware/auth-identity';
import { errorBoundary } from '../shared/middleware/error-boundary';
import { buildDirectInvokeEvent, buildLambdaContext } from '../shared/test-utils';
import type { HonoEnv } from '../shared/types';

describe('directInvokeAdapter', () => {
  function buildApp(handlers: Record<string, (c: import('hono').Context<HonoEnv>) => Response | Promise<Response>>) {
    const app = new Hono<HonoEnv>();
    app.onError(errorBoundary);
    app.use('*', authIdentity);
    for (const [path, handler] of Object.entries(handlers)) {
      app.post(path, handler);
    }
    return app;
  }

  it('dispatches direct-invoke events to /<__route> and returns the JSON body', async () => {
    const app = buildApp({
      '/deleteDocument': (c) => c.json({ ok: true, deleted: 'abc' }),
    });
    const adapter = directInvokeAdapter(app);

    const event = buildDirectInvokeEvent('deleteDocument', { documentUuid: 'abc' });
    const result = await adapter(event, buildLambdaContext());

    expect(result).toEqual({ ok: true, deleted: 'abc' });
  });

  it('marks invocationType as direct (identity is null)', async () => {
    const app = buildApp({
      '/check': (c) =>
        c.json({
          invocationType: c.var.invocationType,
          identityPresent: c.var.identity !== null,
        }),
    });
    const adapter = directInvokeAdapter(app);

    const event = buildDirectInvokeEvent('check');
    const result = (await adapter(event, buildLambdaContext())) as {
      invocationType: string;
      identityPresent: boolean;
    };

    expect(result.invocationType).toBe('direct');
    expect(result.identityPresent).toBe(false);
  });

  it('returns {success:false, error, status:404} for unknown routes (does NOT throw)', async () => {
    const app = buildApp({});
    const adapter = directInvokeAdapter(app);

    const event = buildDirectInvokeEvent('nonexistent');
    const result = (await adapter(event, buildLambdaContext())) as {
      success: boolean;
      error: string;
      status: number;
    };

    // CRITICAL: direct-invoke MUST NOT throw on error — the dispatcher
    // distinguishes "infra failure" (throw → unhandled Lambda error → SQS retry)
    // from "handler logic failure" (success:false → terminal). See PF-1.
    expect(result.success).toBe(false);
    expect(result.status).toBe(404);
    expect(result.error).toContain('nonexistent');
  });

  it('returns {success:false, error} when a route handler throws (errorBoundary catches)', async () => {
    const app = buildApp({
      '/throws': () => {
        throw new Error('handler exploded');
      },
    });
    const adapter = directInvokeAdapter(app);

    const event = buildDirectInvokeEvent('throws');
    const result = (await adapter(event, buildLambdaContext())) as {
      success: boolean;
      error: string;
    };

    expect(result.success).toBe(false);
    expect(result.error).toBe('handler exploded');
  });

  it('forwards arguments as the JSON request body to route handlers', async () => {
    const app = buildApp({
      '/echo': async (c) => c.json({ received: await c.req.json() }),
    });
    const adapter = directInvokeAdapter(app);

    const event = buildDirectInvokeEvent('echo', { foo: 'bar', n: 42 });
    const result = (await adapter(event, buildLambdaContext())) as { received: Record<string, unknown> };

    expect(result.received).toEqual({ foo: 'bar', n: 42 });
  });
});
