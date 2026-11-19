/**
 * Paddle integration (provider kept from the old app).
 *
 * Two halves, deliberately separate:
 *
 *   - the **webhook** is the source of truth for entitlement, and works with only
 *     a signing secret — so it can be tested (and even run) locally without a
 *     Paddle account
 *   - **checkout** needs `PADDLE_API_KEY` + price ids; without them it answers 503
 *     with a clear message instead of a broken redirect
 *
 * Paddle is the merchant of record: tax, invoices and refunds stay theirs, which
 * is why keeping it is cheaper than moving to Stripe.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

import { eq } from 'drizzle-orm';

import { serviceDb } from './db/service-client';
import { curioSubscriptions, purchases, receipts } from './db/schema';

export const PADDLE_WEBHOOK_SECRET = () => process.env.PADDLE_WEBHOOK_SECRET ?? '';
export const PADDLE_API_KEY = () => process.env.PADDLE_API_KEY ?? '';

export const paddleConfigured = () => Boolean(PADDLE_API_KEY());

/**
 * `Paddle-Signature: ts=1700000000;h1=abcdef…`
 * HMAC-SHA256 over `${ts}:${rawBody}` with the notification secret.
 */
export function verifyPaddleSignature(
  rawBody: string,
  header: string | undefined,
  secret: string,
  now = Date.now(),
): { ok: boolean; reason?: string } {
  if (!secret) return { ok: false, reason: 'PADDLE_WEBHOOK_SECRET is not set' };
  if (!header) return { ok: false, reason: 'Missing Paddle-Signature header' };

  const parts = Object.fromEntries(
    header.split(';').map((part) => {
      const [key, value] = part.split('=');
      return [key?.trim(), value?.trim()];
    }),
  ) as { ts?: string; h1?: string };

  if (!parts.ts || !parts.h1) return { ok: false, reason: 'Malformed signature header' };

  const timestamp = Number(parts.ts);
  if (!Number.isFinite(timestamp)) return { ok: false, reason: 'Malformed timestamp' };
  // Reject replays of old notifications (Paddle's own recommendation: 5 minutes).
  if (Math.abs(now - timestamp * 1000) > 5 * 60_000) {
    return { ok: false, reason: 'Signature timestamp is too old' };
  }

  const expected = createHmac('sha256', secret).update(`${parts.ts}:${rawBody}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.h1);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: 'Signature mismatch' };
  }
  return { ok: true };
}

export interface PaddleEvent {
  event_type?: string;
  data?: Record<string, unknown>;
}

const asDate = (value: unknown): Date | null => {
  if (typeof value !== 'string' || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const customUserId = (data: Record<string, unknown> | undefined): string | null => {
  const custom = data?.custom_data as { userId?: string } | undefined;
  return typeof custom?.userId === 'string' ? custom.userId : null;
};

/**
 * Apply one notification. Returns what it touched so the route can report it and
 * tests can assert it without reading the database.
 */
export async function applyPaddleEvent(event: PaddleEvent): Promise<{
  handled: boolean;
  subscriptionId?: string;
  purchaseId?: string;
}> {
  const type = event.event_type ?? '';
  const data = (event.data ?? {}) as Record<string, unknown>;

  if (type.startsWith('subscription.')) {
    const userId = customUserId(data);
    const providerSubscriptionId = String(data.id ?? '');
    if (!userId || !providerSubscriptionId) return { handled: false };

    const status =
      type === 'subscription.canceled'
        ? 'cancelled'
        : type === 'subscription.paused'
          ? 'paused'
          : String(data.status ?? 'active');

    const values = {
      userId,
      provider: 'paddle',
      status,
      tier: String((data.items as Array<{ price?: { name?: string } }> | undefined)?.[0]?.price?.name ?? 'super'),
      providerSubscriptionId,
      providerCustomerId: String(data.customer_id ?? '') || null,
      currentPeriodStart: asDate(data.current_billing_period && (data.current_billing_period as { starts_at?: string }).starts_at),
      currentPeriodEnd: asDate(data.current_billing_period && (data.current_billing_period as { ends_at?: string }).ends_at),
      nextBillingDate: asDate(data.next_billed_at),
      cancelledAt: status === 'cancelled' ? new Date() : null,
      updatedAt: new Date(),
    };

    const [existing] = await serviceDb
      .select({ subscriptionId: curioSubscriptions.subscriptionId })
      .from(curioSubscriptions)
      .where(eq(curioSubscriptions.providerSubscriptionId, providerSubscriptionId))
      .limit(1);

    if (existing) {
      await serviceDb
        .update(curioSubscriptions)
        .set(values)
        .where(eq(curioSubscriptions.subscriptionId, existing.subscriptionId));
      return { handled: true, subscriptionId: existing.subscriptionId };
    }

    const [row] = await serviceDb
      .insert(curioSubscriptions)
      .values({ subscriptionId: crypto.randomUUID(), ...values })
      .returning();
    return { handled: true, subscriptionId: row.subscriptionId };
  }

  if (type === 'transaction.completed') {
    const userId = customUserId(data);
    const providerTransactionId = String(data.id ?? '');
    if (!userId || !providerTransactionId) return { handled: false };

    // One purchase per transaction, so a retried webhook cannot double-grant.
    const [existing] = await serviceDb
      .select({ id: purchases.id })
      .from(purchases)
      .where(eq(purchases.receiptId, providerTransactionId))
      .limit(1);
    if (existing) return { handled: true, purchaseId: existing.id };

    const [receipt] = await serviceDb
      .insert(receipts)
      .values({
        receiptId: providerTransactionId,
        userId,
        provider: 'paddle',
        payload: JSON.stringify(data).slice(0, 20_000),
      })
      .onConflictDoNothing()
      .returning();

    const [purchase] = await serviceDb
      .insert(purchases)
      .values({
        id: crypto.randomUUID(),
        userId,
        source: 'paddle',
        receiptId: receipt?.receiptId ?? providerTransactionId,
      })
      .returning();

    return { handled: true, purchaseId: purchase.id };
  }

  return { handled: false };
}
