/**
 * Paddle: the signature is the whole security model for the webhook, and the
 * mapping decides what a customer is entitled to. Both get tests.
 */

import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { verifyPaddleSignature } from './billing';

const SECRET = 'test-webhook-secret';

function sign(body: string, ts = Math.floor(Date.now() / 1000)) {
  const h1 = createHmac('sha256', SECRET).update(`${ts}:${body}`).digest('hex');
  return { header: `ts=${ts};h1=${h1}`, body };
}

describe('verifyPaddleSignature', () => {
  it('accepts a correctly signed body', () => {
    const body = JSON.stringify({ event_type: 'subscription.created' });
    expect(verifyPaddleSignature(body, sign(body).header, SECRET)).toEqual({ ok: true });
  });

  it('rejects a tampered body', () => {
    const body = JSON.stringify({ event_type: 'subscription.created' });
    const { header } = sign(body);
    const result = verifyPaddleSignature(body.replace('created', 'canceled'), header, SECRET);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/mismatch/i);
  });

  it('rejects a replay from outside the tolerance window', () => {
    const body = '{}';
    const old = Math.floor(Date.now() / 1000) - 10 * 60;
    expect(verifyPaddleSignature(body, sign(body, old).header, SECRET).ok).toBe(false);
  });

  it('refuses when no secret is configured', () => {
    const body = '{}';
    expect(verifyPaddleSignature(body, sign(body).header, '').ok).toBe(false);
  });
});
