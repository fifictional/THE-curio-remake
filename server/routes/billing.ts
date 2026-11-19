/**
 * Billing routes: webhook (source of truth), subscription status, checkout.
 */

import type { Context } from 'hono';
import { z } from 'zod';

import {
  applyPaddleEvent,
  paddleConfigured,
  verifyPaddleSignature,
  PADDLE_WEBHOOK_SECRET,
} from '../billing';
import { asUser } from '../db/scope';
import { curioSubscriptions } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getValidatedBody, validateBody } from '../middleware/validate';
import type { HonoEnv } from '../types';

type Identity = { sub: string } | null;

const CheckoutArgs = z.object({
  /** A Paddle price id from the catalogue (`exam_modules`/`bundles` SKUs). */
  priceId: z.string().min(3).max(120),
});

export const checkoutValidate = validateBody(CheckoutArgs);

/**
 * POST /webhooks/paddle — signed by Paddle, so it is unauthenticated but proven.
 * The raw body must reach the verifier untouched: re-serialising JSON breaks the
 * HMAC.
 */
export async function paddleWebhook(c: Context<HonoEnv>): Promise<Response> {
  const raw = await c.req.text();
  const signature = c.req.header('paddle-signature');
  const check = verifyPaddleSignature(raw, signature, PADDLE_WEBHOOK_SECRET());

  if (!check.ok) return c.json({ success: false, error: check.reason }, 401);

  let event;
  try {
    event = JSON.parse(raw) as { event_type?: string; data?: Record<string, unknown> };
  } catch {
    return c.json({ success: false, error: 'Invalid JSON' }, 400);
  }

  const applied = await applyPaddleEvent(event);
  return c.json({ success: true, ...applied });
}

/** GET /api/billing/status — what the caller is entitled to right now. */
export async function billingStatus(c: Context<HonoEnv>): Promise<Response> {
  const identity = c.var.identity as Identity;
  if (!identity) return c.json({ success: false, error: 'Not signed in' }, 401);

  const rows = await asUser(identity.sub, (db) =>
    db.select().from(curioSubscriptions).where(eq(curioSubscriptions.userId, identity.sub)),
  );

  return c.json({
    success: true,
    configured: paddleConfigured(),
    subscriptions: rows.map((row) => ({
      subscriptionId: row.subscriptionId,
      provider: row.provider,
      status: row.status,
      tier: row.tier,
      currentPeriodEnd: row.currentPeriodEnd,
      cancelledAt: row.cancelledAt,
    })),
    active: rows.some((row) => row.status === 'active'),
  });
}

/**
 * POST /api/billing/checkout — create a Paddle transaction and return its
 * checkout URL. Without credentials it answers 503 instead of redirecting into a
 * dead page, which is what the old pricing buttons did.
 */
export async function createCheckout(c: Context<HonoEnv>): Promise<Response> {
  const identity = c.var.identity as Identity;
  if (!identity) return c.json({ success: false, error: 'Not signed in' }, 401);

  const input = getValidatedBody<typeof CheckoutArgs>(c);
  if (!paddleConfigured()) {
    return c.json(
      {
        success: false,
        error: 'Checkout needs PADDLE_API_KEY (and a sandbox price id) in .env',
      },
      503,
    );
  }

  // Paddle Billing API: create a transaction, then hand the client its checkout URL.
  const res = await fetch('https://api.paddle.com/transactions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
    },
    body: JSON.stringify({
      items: [{ price_id: input.priceId, quantity: 1 }],
      custom_data: { userId: identity.sub },
      checkout: { settings: { success_url: process.env.PUBLIC_WEB_URL ?? 'http://localhost:5173' } },
    }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    data?: { id?: string; checkout?: { url?: string } };
    error?: { detail?: string };
  };

  if (!res.ok || !body.data?.checkout?.url) {
    return c.json(
      { success: false, error: body.error?.detail ?? `Paddle checkout failed (${res.status})` },
      502,
    );
  }

  return c.json({ success: true, transactionId: body.data.id, url: body.data.checkout.url });
}
