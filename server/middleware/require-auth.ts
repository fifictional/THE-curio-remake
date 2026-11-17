/**
 * Reject anonymous requests before anything else runs.
 *
 * Routes check the session themselves, but a validator or a body parse that runs
 * first turns "not signed in" into a 400 or a 500 — the caller learns the shape
 * of the request they were never allowed to make. This puts the 401 first.
 */

import type { MiddlewareHandler } from 'hono';

import type { HonoEnv } from '../types';

export const requireAuth: MiddlewareHandler<HonoEnv> = async (c, next) => {
  if (!c.var.identity) {
    return c.json({ success: false, error: 'Not signed in' }, 401);
  }
  return next();
};
