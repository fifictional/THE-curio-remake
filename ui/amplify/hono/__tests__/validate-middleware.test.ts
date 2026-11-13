import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { z } from 'zod';

import { appsyncAdapter } from '../shared/hono-appsync-adapter';
import { directInvokeAdapter } from '../shared/hono-direct-invoke-adapter';
import { authIdentity } from '../shared/middleware/auth-identity';
import { errorBoundary } from '../shared/middleware/error-boundary';
import { validateBody, getValidatedBody } from '../shared/middleware/validate';
import {
  buildAppSyncEvent,
  buildDirectInvokeEvent,
  buildLambdaContext,
} from '../shared/test-utils';
import type { HonoEnv } from '../shared/types';

const TestSchema = z.object({
  name: z.string().min(2),
  age: z.number().int().nonnegative(),
});

function buildAppWithValidatedRoute() {
  const app = new Hono<HonoEnv>();
  app.onError(errorBoundary);
  app.use('*', authIdentity);
  app.post('/validated', validateBody(TestSchema), (c) => {
    const data = getValidatedBody<typeof TestSchema>(c);
    return c.json({ ok: true, data });
  });
  return app;
}

describe('validateBody middleware (direct-invoke path)', () => {
  it('passes through valid payloads and exposes them via getValidatedBody', async () => {
    const adapter = directInvokeAdapter(buildAppWithValidatedRoute());

    const event = buildDirectInvokeEvent('validated', { name: 'alice', age: 30 });
    const result = (await adapter(event, buildLambdaContext())) as {
      ok: boolean;
      data: { name: string; age: number };
    };

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ name: 'alice', age: 30 });
  });

  it('returns {success:false, error, issues, status:400} for invalid payloads', async () => {
    const adapter = directInvokeAdapter(buildAppWithValidatedRoute());

    const event = buildDirectInvokeEvent('validated', { name: 'x' });
    const result = (await adapter(event, buildLambdaContext())) as {
      success: boolean;
      error: string;
      issues: unknown;
      status: number;
    };

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/Validation failed/);
    expect(result.issues).toBeTruthy();
  });
});

describe('validateBody middleware (AppSync path)', () => {
  it('throws (so AppSync surfaces a GraphQL error) for invalid args', async () => {
    const adapter = appsyncAdapter(buildAppWithValidatedRoute());

    const event = buildAppSyncEvent({
      fieldName: 'validated',
      args: { name: 'x' },
    });

    await expect(adapter(event, buildLambdaContext())).rejects.toThrow(/Validation failed/);
  });

  it('passes through and returns body when args are valid', async () => {
    const adapter = appsyncAdapter(buildAppWithValidatedRoute());

    const event = buildAppSyncEvent({
      fieldName: 'validated',
      args: { name: 'alice', age: 30 },
    });
    const result = (await adapter(event, buildLambdaContext())) as {
      ok: boolean;
      data: { name: string; age: number };
    };

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ name: 'alice', age: 30 });
  });
});
