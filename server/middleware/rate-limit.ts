/**
 * In-memory rate limiting.
 *
 * Deliberately simple: one process, one map, a sliding window per key. It stops
 * the two things that cost real money or real trust — password guessing against
 * `/api/auth/*` and unbounded AI calls — without adding Redis to a stack that
 * runs on one box.
 *
 * Limits are env-tunable and `RATE_LIMIT_DISABLED=1` turns the whole thing off
 * (tests, local load checks). When this moves to more than one process, the map
 * has to become shared storage; nothing in the routes needs to change.
 */

import type { Context, MiddlewareHandler, Next } from 'hono';

export interface RateLimitOptions {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Allowed requests per window per key. */
  max: number;
  /** Used in the response body and to namespace the bucket. */
  name: string;
  /** Bucket key. Defaults to the session user, then the client IP. */
  key?: (c: Context) => string;
  /** Injectable clock (tests). */
  now?: () => number;
}

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

/** Forget every bucket (tests, and useful after a deploy). */
export function resetRateLimits(): void {
  buckets.clear();
}

function defaultKey(c: Context): string {
  const identity = (c.var as { identity?: { sub?: string } }).identity;
  if (identity?.sub) return `user:${identity.sub}`;

  const forwarded = c.req.header('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'local';
  return `ip:${ip}`;
}

export function rateLimit(options: RateLimitOptions): MiddlewareHandler {
  const now = options.now ?? (() => Date.now());
  const keyFor = options.key ?? defaultKey;

  return async (c: Context, next: Next) => {
    if (process.env.RATE_LIMIT_DISABLED === '1') return next();

    const bucketKey = `${options.name}:${keyFor(c)}`;
    const at = now();
    const bucket = buckets.get(bucketKey) ?? { hits: [] };

    // Slide the window: keep only hits inside it.
    bucket.hits = bucket.hits.filter((t) => at - t < options.windowMs);

    if (bucket.hits.length >= options.max) {
      const retryAfter = Math.ceil((options.windowMs - (at - bucket.hits[0])) / 1000);
      buckets.set(bucketKey, bucket);
      c.header('retry-after', String(Math.max(retryAfter, 1)));
      return c.json(
        {
          success: false,
          error: `Too many requests (${options.name}). Try again in ${Math.max(retryAfter, 1)}s.`,
        },
        429,
      );
    }

    bucket.hits.push(at);
    buckets.set(bucketKey, bucket);

    // Keep the map from growing forever in a long-running process.
    if (buckets.size > 5000) {
      for (const [key, value] of buckets) {
        if (!value.hits.some((t) => at - t < options.windowMs)) buckets.delete(key);
      }
    }

    return next();
  };
}

/** The limits this app actually uses, in one place. */
export const limits = {
  /** Password guessing: 20 attempts a minute per IP (humans never get close). */
  auth: rateLimit({
    name: 'auth',
    windowMs: 60_000,
    max: Number(process.env.RATE_LIMIT_AUTH_MAX ?? 20),
  }),
  /** AI calls cost money: 30 turns per 5 minutes per user. */
  aiChat: rateLimit({ name: 'aiChat', windowMs: 5 * 60_000, max: 30 }),
  /** Retrieval is cheap but not free. */
  ragSearch: rateLimit({ name: 'ragSearch', windowMs: 60_000, max: 60 }),
  ragReindex: rateLimit({ name: 'ragReindex', windowMs: 60_000, max: 20 }),
  /** Uploads write to disk. */
  upload: rateLimit({ name: 'upload', windowMs: 60_000, max: 30 }),
};
