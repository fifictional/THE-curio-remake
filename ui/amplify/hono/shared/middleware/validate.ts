import type { Context, MiddlewareHandler } from 'hono';
import type { ZodTypeAny, infer as ZodInfer } from 'zod';
import type { HonoEnv } from '../types';

/**
 * Validation middleware factories using Zod.
 *
 * Two flavours are exposed:
 *
 * 1. `validateBody(schema)` — parses `await c.req.json()` against the schema.
 *    Stashes the parsed value on `c.var.body` (typed via `c.var.body as T`
 *    at call sites).
 *
 * 2. `validateArguments(schema)` — for routes that receive the raw direct-invoke
 *    or AppSync `arguments` object. The adapters in this folder serialize
 *    `event.arguments` as the JSON body of the synthetic Hono request, so
 *    `validateBody` works for both. `validateArguments` is exported as a more
 *    intent-revealing alias.
 *
 * On validation failure, returns a 400 JSON response. The shape matches the
 * error-boundary's "direct-invoke" shape (`{ success:false, error, issues }`)
 * for direct/cron invocations and the AppSync GraphQL shape is taken care of
 * by the adapter (status 400 → adapter rewraps as throw).
 *
 * NOTE: we deliberately do NOT use `@hono/zod-validator` to avoid an extra dep;
 * this wrapper is ~15 LOC and matches the project's existing zod conventions.
 */

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
      return jsonValidationError(
        c,
        'Validation failed',
        parsed.error.flatten(),
      );
    }
    c.set(VALIDATED_BODY_KEY as never, parsed.data as never);
    await next();
  };
}

export const validateArguments = validateBody;

/**
 * Pull the validated body out of the Hono context inside a route handler.
 *
 * Usage:
 * ```ts
 * const Schema = z.object({ documentUuid: z.string().uuid() });
 * app.post('/deleteDocument', validateBody(Schema), async (c) => {
 *   const { documentUuid } = getValidatedBody<typeof Schema>(c);
 *   // ...
 * });
 * ```
 */
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
  return c.json(
    {
      success: false,
      error: message,
      issues,
    },
    400,
  );
}
