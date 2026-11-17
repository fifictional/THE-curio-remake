/**
 * Rate limiting is a security control, so it gets tests rather than a comment:
 * the limit, the window, and the per-key isolation all have to hold.
 */

import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import { rateLimit, resetRateLimits } from './middleware/rate-limit';

function app(max: number, windowMs: number, now: () => number, name = 'test') {
  const a = new Hono();
  a.use('*', rateLimit({ name, max, windowMs, now }));
  a.get('/', (c) => c.json({ ok: true }));
  return a;
}

describe('rateLimit', () => {
  it('allows up to the limit, then answers 429 with Retry-After', async () => {
    resetRateLimits();
    const clock = { t: 1_000_000 };
    const a = app(3, 60_000, () => clock.t);

    for (let i = 0; i < 3; i += 1) {
      expect((await a.request('/', { headers: { 'x-forwarded-for': '1.2.3.4' } })).status).toBe(200);
    }

    const blocked = await a.request('/', { headers: { 'x-forwarded-for': '1.2.3.4' } });
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('retry-after')).toBe('60');
    expect(((await blocked.json()) as { error: string }).error).toMatch(/Too many requests/);
  });

  it('keeps one client’s exhaustion away from another', async () => {
    resetRateLimits();
    const clock = { t: 1_000_000 };
    const a = app(1, 60_000, () => clock.t);

    expect((await a.request('/', { headers: { 'x-forwarded-for': '1.1.1.1' } })).status).toBe(200);
    expect((await a.request('/', { headers: { 'x-forwarded-for': '1.1.1.1' } })).status).toBe(429);
    expect((await a.request('/', { headers: { 'x-forwarded-for': '2.2.2.2' } })).status).toBe(200);
  });

  it('forgets hits once the window slides past', async () => {
    resetRateLimits();
    const clock = { t: 1_000_000 };
    const a = app(1, 60_000, () => clock.t);

    expect((await a.request('/', { headers: { 'x-forwarded-for': '3.3.3.3' } })).status).toBe(200);
    expect((await a.request('/', { headers: { 'x-forwarded-for': '3.3.3.3' } })).status).toBe(429);

    clock.t += 60_001;
    expect((await a.request('/', { headers: { 'x-forwarded-for': '3.3.3.3' } })).status).toBe(200);
  });

  it('buckets by session user when there is one', async () => {
    resetRateLimits();
    const clock = { t: 1_000_000 };
    const a = new Hono();
    // Stand-in for the identity middleware.
    a.use('*', async (c, next) => {
      const sub = c.req.header('x-dev-user');
      c.set('identity' as never, sub ? { sub } : null);
      await next();
    });
    a.use('*', rateLimit({ name: 'user-bucket', max: 1, windowMs: 60_000, now: () => clock.t }));
    a.get('/', (c) => c.json({ ok: true }));

    expect((await a.request('/', { headers: { 'x-dev-user': 'user-a' } })).status).toBe(200);
    expect((await a.request('/', { headers: { 'x-dev-user': 'user-a' } })).status).toBe(429);
    // Same IP, different user: a separate bucket.
    expect((await a.request('/', { headers: { 'x-dev-user': 'user-b' } })).status).toBe(200);
  });
});
