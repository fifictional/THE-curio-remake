/**
 * Unit tests for the `fulfillPurchase` route (P2-2).
 *
 * Mocks the data client's `Bundle`, `Receipt`, `Purchase` model methods so we
 * can exercise:
 *   - happy path (bundle by defaultSku, receipt + purchase succeed)
 *   - bundle fallback (defaultSku miss → scan additionalSkus)
 *   - no bundle found (throws)
 *   - receipt failure is non-fatal (returns warning, receiptId null)
 *   - purchase failure is critical (throws)
 *   - validation errors
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

import { appsyncAdapter } from '../shared/hono-appsync-adapter';
import { directInvokeAdapter } from '../shared/hono-direct-invoke-adapter';
import { authIdentity } from '../shared/middleware/auth-identity';
import { errorBoundary } from '../shared/middleware/error-boundary';
import {
  buildAppSyncEvent,
  buildCognitoIdentity,
  buildDirectInvokeEvent,
  buildLambdaContext,
} from '../shared/test-utils';
import type { HonoEnv } from '../shared/types';
import { createFulfillPurchaseRoute } from '../routes/fulfill-purchase';
import type { HonoDataClient } from '../shared/data-client';

interface MockBundleResponse {
  data?: Array<{
    bundleUuid: string;
    name: string;
    defaultSku: string;
    additionalSkus?: string[];
  }>;
}
interface MockCreateResponse {
  errors?: Array<{ message: string }>;
  data?: { receiptId?: string } | { userId?: string };
}

function buildClient(overrides: {
  bundleList?: MockBundleResponse[];
  receiptCreate?: MockCreateResponse;
  purchaseCreate?: MockCreateResponse | (() => Promise<MockCreateResponse>);
}): HonoDataClient {
  const bundleListMock = vi
    .fn<(arg: unknown) => Promise<MockBundleResponse>>()
    .mockImplementation(async () => overrides.bundleList?.shift() ?? { data: [] });
  const receiptCreateMock = vi
    .fn<(arg: unknown) => Promise<MockCreateResponse>>()
    .mockResolvedValue(overrides.receiptCreate ?? { data: {} });
  const purchaseCreateMock = vi
    .fn<(arg: unknown) => Promise<MockCreateResponse>>()
    .mockImplementation(async () => {
      if (typeof overrides.purchaseCreate === 'function') return overrides.purchaseCreate();
      return overrides.purchaseCreate ?? { data: {} };
    });

  return {
    models: {
      Bundle: { list: bundleListMock },
      Receipt: { create: receiptCreateMock },
      Purchase: { create: purchaseCreateMock },
    },
  } as unknown as HonoDataClient;
}

function buildApp(client: HonoDataClient) {
  const app = new Hono<HonoEnv>();
  app.onError(errorBoundary);
  app.use('*', authIdentity);
  const route = createFulfillPurchaseRoute(client);
  app.post('/fulfillPurchase', route.validate, route.handler);
  return app;
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('fulfillPurchase route (P2-2)', () => {
  it('happy path — bundle by defaultSku, receipt + purchase succeed', async () => {
    const client = buildClient({
      bundleList: [
        {
          data: [
            { bundleUuid: 'bundle-1', name: 'Pro', defaultSku: 'sku-1', additionalSkus: [] },
          ],
        },
      ],
      receiptCreate: { data: {} },
      purchaseCreate: { data: {} },
    });
    const adapter = directInvokeAdapter(buildApp(client));

    const event = buildDirectInvokeEvent('fulfillPurchase', {
      sku: 'sku-1',
      userId: 'user-1',
      provider: 'paddle',
      receiptPayload: JSON.stringify({ tx: 'abc' }),
    });
    const result = (await adapter(event, buildLambdaContext())) as {
      success: boolean;
      bundleUuid: string;
      receiptId: string | null;
      warning: string | null;
    };

    expect(result.success).toBe(true);
    expect(result.bundleUuid).toBe('bundle-1');
    expect(result.receiptId).toMatch(/[0-9a-f-]{36}/i);
    expect(result.warning).toBeNull();
  });

  it('bundle fallback — defaultSku miss → scan additionalSkus', async () => {
    const client = buildClient({
      bundleList: [
        { data: [] }, // first call (filter by defaultSku) returns empty
        {
          data: [
            { bundleUuid: 'bundle-1', name: 'A', defaultSku: 'other', additionalSkus: ['sku-x'] },
            { bundleUuid: 'bundle-2', name: 'B', defaultSku: 'foo', additionalSkus: ['sku-target'] },
          ],
        },
      ],
      purchaseCreate: { data: {} },
    });
    const adapter = directInvokeAdapter(buildApp(client));

    const event = buildDirectInvokeEvent('fulfillPurchase', {
      sku: 'sku-target',
      userId: 'user-1',
      provider: 'paddle',
    });
    const result = (await adapter(event, buildLambdaContext())) as { bundleUuid: string };

    expect(result.bundleUuid).toBe('bundle-2');
  });

  it('throws "No bundle found" when neither lookup matches', async () => {
    const client = buildClient({
      bundleList: [{ data: [] }, { data: [] }],
    });
    const adapter = directInvokeAdapter(buildApp(client));

    const event = buildDirectInvokeEvent('fulfillPurchase', {
      sku: 'nope',
      userId: 'user-1',
      provider: 'paddle',
    });
    const result = (await adapter(event, buildLambdaContext())) as {
      success: boolean;
      error: string;
    };

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/No bundle found for SKU: nope/);
  });

  it('receipt failure is NON-fatal — warning set, receiptId cleared, purchase still created', async () => {
    const client = buildClient({
      bundleList: [
        { data: [{ bundleUuid: 'b1', name: 'X', defaultSku: 'sku-1', additionalSkus: [] }] },
      ],
      receiptCreate: { errors: [{ message: 'duplicate receiptId' }] },
      purchaseCreate: { data: {} },
    });
    const adapter = directInvokeAdapter(buildApp(client));

    const event = buildDirectInvokeEvent('fulfillPurchase', {
      sku: 'sku-1',
      userId: 'user-1',
      provider: 'paddle',
      receiptPayload: '{"tx":"abc"}',
    });
    const result = (await adapter(event, buildLambdaContext())) as {
      success: boolean;
      receiptId: string | null;
      warning: string | null;
    };

    expect(result.success).toBe(true);
    expect(result.receiptId).toBeNull();
    expect(result.warning).toMatch(/Receipt creation failed: duplicate receiptId/);
  });

  it('purchase failure is CRITICAL — throws', async () => {
    const client = buildClient({
      bundleList: [
        { data: [{ bundleUuid: 'b1', name: 'X', defaultSku: 'sku-1', additionalSkus: [] }] },
      ],
      purchaseCreate: { errors: [{ message: 'constraint violation' }] },
    });
    const adapter = directInvokeAdapter(buildApp(client));

    const event = buildDirectInvokeEvent('fulfillPurchase', {
      sku: 'sku-1',
      userId: 'user-1',
      provider: 'paddle',
    });
    const result = (await adapter(event, buildLambdaContext())) as {
      success: boolean;
      error: string;
    };

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Purchase creation failed: constraint violation/);
  });

  it('400 on missing sku (validateBody)', async () => {
    const client = buildClient({});
    const adapter = directInvokeAdapter(buildApp(client));

    const event = buildDirectInvokeEvent('fulfillPurchase', {
      userId: 'user-1',
      provider: 'paddle',
    });
    const result = (await adapter(event, buildLambdaContext())) as {
      success: boolean;
      status: number;
    };

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
  });

  it('AppSync path also returns the full success payload', async () => {
    const client = buildClient({
      bundleList: [
        { data: [{ bundleUuid: 'b1', name: 'X', defaultSku: 'sku-1', additionalSkus: [] }] },
      ],
      purchaseCreate: { data: {} },
    });
    const adapter = appsyncAdapter(buildApp(client));

    const event = buildAppSyncEvent({
      fieldName: 'fulfillPurchase',
      args: { sku: 'sku-1', userId: 'user-1', provider: 'paddle' },
      identity: buildCognitoIdentity(),
    });
    const result = (await adapter(event, buildLambdaContext())) as {
      success: boolean;
      bundleUuid: string;
    };

    expect(result.success).toBe(true);
    expect(result.bundleUuid).toBe('b1');
  });
});
