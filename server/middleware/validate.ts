/**
 * COPY of `amplify/hono/shared/middleware/validate.ts`.
 *
 * Only change: the `HonoEnv` import path (`../types` instead of the Amplify
 * folder's `../types`). Logic is byte-for-byte the original, so that running
 * `routes/move-chat.ts` here exercises the same validation path as production.
 *
 * Kept as a copy (not an import from `amplify/`) so `server/` stays standalone
 * and can be lifted into a new repository without dragging Amplify's build
 * along.
 */

import type { Context, MiddlewareHandler } from 'hono';
import type { ZodTypeAny, infer as ZodInfer } from 'zod';
import type { HonoEnv } from '../types';

const VALIDATED_BODY_KEY = '__validatedBody' as const;

export function validateBody<S extends ZodTypeAny>(
  schema: S,
): MiddlewareHandler<HonoEnv> {
  return async (c, next) => {
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return jsonValidationError(c, 'Request body is not valid JSON', null);
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return jsonValidationError(c, 'Validation failed', parsed.error.flatten());
    }
    c.set(VALIDATED_BODY_KEY as never, parsed.data as never);
    await next();
  };
}

export const validateArguments = validateBody;

export function getValidatedBody<S extends ZodTypeAny>(
  c: Context<HonoEnv>,
): ZodInfer<S> {
  return c.get(VALIDATED_BODY_KEY as never) as ZodInfer<S>;
}

function jsonValidationError(
  c: Context<HonoEnv>,
  message: string,
  issues: unknown,
) {
  return c.json({ success: false, error: message, issues }, 400);
}
