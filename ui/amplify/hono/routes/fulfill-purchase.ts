/**
 * `fulfillPurchase` query route — P2-2.
 *
 * Source: `amplify/functions/fulfill-purchase/handler.ts` (155 LOC).
 *
 * Migration parity:
 *   - **Receipt failure is non-fatal** — preserved exactly. If Receipt.create()
 *     fails (response.errors OR exception), we clear `receiptId`, capture the
 *     error in `receiptError`, and STILL attempt Purchase.create(). The final
 *     success response includes a `warning` field describing the receipt
 *     failure. This is the contract the Paddle webhook relies on.
 *   - **Purchase failure is critical** — preserved exactly. If Purchase.create()
 *     fails (response.errors OR exception), we throw, which the error-boundary
 *     middleware converts into the appropriate invocation-type response.
 *   - **Bundle lookup fallback** — preserved exactly. We first query by
 *     `defaultSku`; if not found, we scan ALL bundles client-side and check
 *     `additionalSkus` membership. (This is O(n) over all bundles — same as
 *     original. Not optimized here; that's a separate task.)
 *   - **Console logging** — original used `[fulfill-purchase]` prefix on
 *     console.log/error calls. Preserved verbatim so existing log search
 *     patterns (Logs Insights queries, alerts) keep working. The structured
 *     request-logger middleware adds start/finish on top of these.
 *
 * AppSync field shape (from `amplify/data/resource.ts:1394-1409`):
 *
 *   fulfillPurchase(
 *     sku: String!,
 *     userId: ID!,
 *     provider: enum('manual'|'stripe'|'paddle'|'google'|'apple'|'other'|'flylane'),
 *     receiptPayload: String,
 *   ): { success: Boolean!, bundleUuid: ID, receiptId: ID, warning: String }
 *
 * Auth: `allow.publicApiKey()` — Paddle webhook hits this via API key.
 *
 * @see docs/2026-05-27-amplify-to-hono-migration-plan.md §10.4 P2-2.
 */

import type { Context, MiddlewareHandler } from 'hono';
import { z } from 'zod';

import type { HonoDataClient } from '../shared/data-client';
import {
  getValidatedBody,
  validateBody,
} from '../shared/middleware/validate';
import type { HonoEnv } from '../shared/types';

// Provider enum mirrors `a.enum([...])` in the AppSync schema. AppSync
// validates this at the GraphQL layer; Zod re-validates at the Hono layer so
// direct-invoke callers can't slip an arbitrary string through.
export const PurchaseProvider = z.enum([
  'manual',
  'stripe',
  'paddle',
  'google',
  'apple',
  'other',
  'flylane',
]);

export const FulfillPurchaseArgs = z.object({
  sku: z.string().min(1, 'sku is required'),
  userId: z.string().min(1, 'userId is required'),
  // AppSync emits `null` for an unset enum; coerce to undefined so the
  // downstream `client.models.Purchase.create({ source: provider })` call sees
  // a clean value. Original handler doesn't default — preserve that, but
  // accept missing/null at the Hono boundary.
  provider: PurchaseProvider.nullish(),
  receiptPayload: z.string().nullish(),
});

export interface FulfillPurchaseRoute {
  validate: MiddlewareHandler<HonoEnv>;
  handler: (c: Context<HonoEnv>) => Promise<Response>;
}

export function createFulfillPurchaseRoute(
  client: HonoDataClient,
): FulfillPurchaseRoute {
  const validate = validateBody(FulfillPurchaseArgs);

  const handler = async (c: Context<HonoEnv>): Promise<Response> => {
    const { sku, userId, provider, receiptPayload } =
      getValidatedBody<typeof FulfillPurchaseArgs>(c);
    const now = new Date().toISOString();

    console.log('[fulfill-purchase] Starting fulfillment', { sku, userId, provider });

    // ---- 1. Look up bundle by SKU (defaultSku first, then additionalSkus) ----
    const bundlesResponse = await client.models.Bundle.list({
      filter: { defaultSku: { eq: sku } },
      selectionSet: ['bundleUuid', 'name', 'defaultSku', 'additionalSkus'],
    });

    let bundle = bundlesResponse.data?.[0];

    if (!bundle) {
      const allBundlesResponse = await client.models.Bundle.list({
        selectionSet: ['bundleUuid', 'name', 'defaultSku', 'additionalSkus'],
      });
      const allBundles = allBundlesResponse.data || [];
      for (const b of allBundles) {
        if (b.additionalSkus?.includes(sku)) {
          bundle = b;
          break;
        }
      }
    }

    if (!bundle) {
      const error = `No bundle found for SKU: ${sku}`;
      console.error('[fulfill-purchase]', error);
      throw new Error(error);
    }

    const bundleUuid = bundle.bundleUuid;
    console.log('[fulfill-purchase] Found bundle', { bundleUuid, name: bundle.name });

    // ---- 2. Try to create Receipt (non-fatal) ----
    let receiptId: string | null = null;
    let receiptError: string | null = null;

    if (receiptPayload) {
      receiptId = crypto.randomUUID();

      try {
        const cleanPayload = JSON.parse(JSON.stringify(receiptPayload));

        const receiptResponse = await client.models.Receipt.create({
          receiptId,
          userId,
          provider: provider ?? undefined,
          payload: cleanPayload,
          createdAt: now,
          updatedAt: now,
        });

        if (receiptResponse.errors) {
          receiptError = receiptResponse.errors[0].message;
          console.error('[fulfill-purchase] Receipt creation failed (non-fatal)', {
            receiptError,
            userId,
            bundleUuid,
          });
          receiptId = null;
        } else {
          console.log('[fulfill-purchase] Receipt created', { receiptId });
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        receiptError = message;
        console.error('[fulfill-purchase] Receipt creation exception (non-fatal)', {
          error: receiptError,
          userId,
          bundleUuid,
        });
        receiptId = null;
      }
    }

    // ---- 3. Create Purchase record (CRITICAL — must succeed) ----
    const purchaseResponse = await client.models.Purchase.create({
      userId,
      bundleUuid,
      purchasedAt: now,
      source: provider ?? undefined,
      receiptId,
      createdAt: now,
      updatedAt: now,
    });

    if (purchaseResponse.errors) {
      const purchaseError = purchaseResponse.errors[0].message;
      console.error('[fulfill-purchase] Purchase creation failed (CRITICAL)', {
        purchaseError,
        userId,
        bundleUuid,
      });
      throw new Error(`Purchase creation failed: ${purchaseError}`);
    }

    console.log('[fulfill-purchase] Purchase created successfully', {
      userId,
      bundleUuid,
      receiptId,
      receiptFailed: !!receiptError,
    });

    return c.json({
      success: true,
      bundleUuid,
      receiptId,
      warning: receiptError ? `Receipt creation failed: ${receiptError}` : null,
    });
  };

  return { validate, handler };
}
