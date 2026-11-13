/**
 * `embedSpaceFlashcards` mutation route — P3-5.
 *
 * Source: `amplify/functions/embed-space-flashcards/handler.ts`.
 *
 * Migration parity:
 *   - Dual invoke shape via `extractSpaceUserArgs` (AppSync args, direct-invoke
 *     body, or legacy top-level `{ spaceUuid, userUuid }`).
 *   - Business failures return `{ success: false, error }` with HTTP 200 — the
 *     original handler never throws for missing args or embed errors.
 *   - Log prefix `[embed-space-flashcards]` preserved on catch path.
 *
 * AppSync field shape (from `amplify/data/resource.ts:1449-1461`):
 *
 *   embedSpaceFlashcards(spaceUuid: String!, userUuid: String!):
 *     { success: Boolean!, embedded: Int, error: String }
 *
 * @see docs/2026-05-27-amplify-to-hono-migration-plan.md §10.5 P3-5.
 */

import type { Context, MiddlewareHandler } from 'hono';

import { embedFlashcardsForSpace } from '../../utils/embed-space-flashcards';
import type { HonoDataClient } from '../shared/data-client';
import { extractSpaceUserArgs } from '../shared/payload-utils';
import type { HonoEnv } from '../shared/types';

const VALIDATED_EMBED_ARGS_KEY = '__embedSpaceFlashcardsArgs' as const;

export interface EmbedSpaceFlashcardsRoute {
  validate: MiddlewareHandler<HonoEnv>;
  handler: (c: Context<HonoEnv>) => Promise<Response>;
}

export function createEmbedSpaceFlashcardsRoute(
  client: HonoDataClient,
): EmbedSpaceFlashcardsRoute {
  const validate: MiddlewareHandler<HonoEnv> = async (c, next) => {
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      c.set(VALIDATED_EMBED_ARGS_KEY as never, { spaceUuid: undefined, userUuid: undefined } as never);
      await next();
      return;
    }
    c.set(VALIDATED_EMBED_ARGS_KEY as never, extractSpaceUserArgs(raw) as never);
    await next();
  };

  const handler = async (c: Context<HonoEnv>): Promise<Response> => {
    const { spaceUuid, userUuid } = c.get(VALIDATED_EMBED_ARGS_KEY as never) as {
      spaceUuid?: string;
      userUuid?: string;
    };

    if (!spaceUuid || !userUuid) {
      return c.json({
        success: false,
        error: 'spaceUuid and userUuid required',
      });
    }

    try {
      const { embedded } = await embedFlashcardsForSpace(
        client,
        spaceUuid,
        userUuid,
      );
      return c.json({ success: true, embedded });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[embed-space-flashcards] Error:', msg);
      return c.json({ success: false, error: msg });
    }
  };

  return { validate, handler };
}
