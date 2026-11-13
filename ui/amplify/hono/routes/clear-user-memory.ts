/**
 * `clearUserMemory` mutation route — P2-4.
 *
 * Source: `amplify/functions/clear-user-memory/handler.ts` (24 LOC).
 *
 * Migration parity: route mirrors the existing handler exactly, including the
 * **no identity check** (see SECURITY note below). Any change to that behaviour
 * is out of scope for this migration and must be a separate task.
 *
 * AppSync field shape (from `amplify/data/resource.ts:1474-1484`):
 *
 *   clearUserMemory(userUuid: ID!): { success: Boolean!, deletedCount: Int! }
 *
 * Route is invokable via:
 *  - AppSync (Phase 5 cutover) → `event.info.fieldName === 'clearUserMemory'`
 *    → `appsyncAdapter` resolves to `POST /clearUserMemory`.
 *  - Direct invoke (testing) → `{ __route: 'clearUserMemory', arguments: {...} }`.
 *
 * SECURITY (preserved gap, NOT introduced here):
 *   The existing Lambda handler does **not** verify that the caller is the
 *   owner of `userUuid` — a malicious authenticated user could clear another
 *   user's memory if they know the target UUID. Discovered during P2-4 audit;
 *   tracked as a follow-up. Adding the check now would change semantics
 *   mid-migration and risks a Sentry storm if the frontend ever calls with a
 *   different UUID for legitimate reasons (e.g. admin tooling). Owner: TBD.
 *
 * @see docs/2026-05-27-amplify-to-hono-migration-plan.md §10.4 P2-4.
 */

import type { Context, MiddlewareHandler } from 'hono';
import { z } from 'zod';
import { MemoryService } from '@ai-memory/memory-service';

import type { HonoDataClient } from '../shared/data-client';
import {
  getValidatedBody,
  validateBody,
} from '../shared/middleware/validate';
import type { HonoEnv } from '../shared/types';

export const ClearUserMemoryArgs = z.object({
  userUuid: z.string().min(1, 'userUuid is required'),
});

export interface ClearUserMemoryRoute {
  validate: MiddlewareHandler<HonoEnv>;
  handler: (c: Context<HonoEnv>) => Promise<Response>;
}

/**
 * Factory: returns the `{validate, handler}` middleware pair to register on a
 * Hono app. The dataClient is captured in closure so route logic stays
 * agnostic to which Hono Lambda hosts it.
 *
 * Usage in `amplify/hono/lambdas/hono-light/index.ts`:
 *
 * ```ts
 * import { dataClient } from './data';
 * import { createClearUserMemoryRoute } from '../../routes/clear-user-memory';
 *
 * const clearUserMemory = createClearUserMemoryRoute(dataClient);
 * app.post('/clearUserMemory', clearUserMemory.validate, clearUserMemory.handler);
 * ```
 */
export function createClearUserMemoryRoute(
  client: HonoDataClient,
): ClearUserMemoryRoute {
  const validate = validateBody(ClearUserMemoryArgs);

  const handler = async (c: Context<HonoEnv>): Promise<Response> => {
    const { userUuid } = getValidatedBody<typeof ClearUserMemoryArgs>(c);

    const memory = new MemoryService(client);
    const deletedCount = await memory.clearAllForOwner(userUuid);

    return c.json({ success: true, deletedCount });
  };

  return { validate, handler };
}
