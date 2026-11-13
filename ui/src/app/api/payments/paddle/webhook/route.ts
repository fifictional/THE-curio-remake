import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { fulfillPurchase as paddleFulfillmentInvoke } from '@/lib/payments/server/fulfillment';

function verifyPaddleSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.PADDLE_WEBHOOK_SECRET_KEY || '';
  if (!secret) return false;

  // Parse the Paddle-Signature header (format: ts=1671552777;h1=signature)
  const parts = signature.split(';');
  let ts: string | null = null;
  let h1: string | null = null;

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 'ts') {
      ts = value;
    } else if (key === 'h1') {
      h1 = value;
    }
  }

  if (!ts || !h1) return false;

  // Optional: Check timestamp to prevent replay attacks (5 second tolerance)
  const currentTime = Math.floor(Date.now() / 1000);
  const timestampAge = currentTime - parseInt(ts);
  if (timestampAge > 5) {
    return false; // Reject events older than 5 seconds
  }

  // Build signed payload: ts:rawBody (don't transform the raw body!)
  const signedPayload = `${ts}:${rawBody}`;

  // Hash the signed payload using HMAC SHA256
  const computedSignature = crypto.createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  // Compare signatures using timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(computedSignature),
    Buffer.from(h1)
  );
}

export async function POST(request: NextRequest) {
  try {
    // Get Paddle-Signature header
    const headers = request.headers;
    const paddleSignature = headers.get("paddle-signature");
    if (!paddleSignature) {
      console.error("Paddle-Signature not present in request headers");
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    // Verify signature
    const raw = await request.text();
    if (!verifyPaddleSignature(raw, paddleSignature)) {
      console.error("Paddle-Signature did not verify");
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Process the paddle event
    const event = JSON.parse(raw);
    const type = event?.event_type || event?.type || '';

    console.log('[webhook] Received event', { type, eventId: event?.event_id });

    // Only process completed transactions
    if (type !== 'transaction.completed') {
      console.log('[webhook] Ignoring non-transaction event', { type });
      return NextResponse.json({ ok: true });
    }

    // Extract custom_data fields
    const customData = event?.data?.custom_data || {};
    const { sku, userId, envIdentifier } = customData;

    // Validate environment identifier to prevent cross-environment fulfillment
    const expectedEnv = process.env.NEXT_PUBLIC_ENVIRONMENT_IDENTIFIER;
    if (expectedEnv && envIdentifier !== expectedEnv) {
      console.error('[webhook] Environment mismatch', { 
        expected: expectedEnv, 
        received: envIdentifier,
        userId,
        sku,
      });
      return NextResponse.json({ 
        error: 'Environment identifier mismatch' 
      }, { status: 400 });
    }

    // Validate required fields
    if (!sku || !userId) {
      console.error('[webhook] Missing required fields', { sku, userId });
      return NextResponse.json({ 
        error: 'Missing sku or userId in custom_data' 
      }, { status: 400 });
    }

    // Fulfill the purchase
    try {
      // Send the raw webhook JSON as the receipt (before parsing)
      // This ensures it's a proper JSON object for GraphQL's a.json() type
      const result = await paddleFulfillmentInvoke({
        sku,
        userId,
        provider: 'paddle',
        receiptPayload: event, // Parsed event is already a clean JSON object
      });

      if (result.success) {
        console.log('[webhook] Fulfillment successful', { 
          userId, 
          sku, 
          bundleUuid: result.bundleUuid,
          transactionId: event?.data?.id,
          });
      } else {
        console.error('[webhook] Fulfillment failed', { 
          userId,
          sku,
          transactionId: event?.data?.id,
        });
      }

      return NextResponse.json({ ok: true, bundleUuid: result.bundleUuid });
    } catch (error: any) {
      console.error('[webhook] Fulfillment failed', { 
        error: error?.message,
        userId,
        sku,
        transactionId: event?.data?.id,
      });
      return NextResponse.json({ 
        error: 'Fulfillment failed',
        message: error?.message 
      }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Webhook error' }, { status: 500 });
  }
}
