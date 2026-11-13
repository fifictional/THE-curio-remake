/**
 * Module-level singleton AppSync data client for Hono-Heavy routes.
 *
 * Mirrors the per-Lambda pattern used by every existing handler (configure
 * Amplify + generate client once per cold start). Routes under
 * `amplify/hono/routes/*` that are hosted on Hono-Heavy import the `dataClient`
 * value from here.
 *
 * Why a per-Lambda file and not a shared one? Same reasoning as
 * `lambdas/hono-light/data.ts`: the `$amplify/env/<lambda-name>` virtual import
 * is generated per-Lambda and references the exact env wiring on THIS Lambda.
 * The shared helper is `amplify/hono/shared/data-client.ts::configureDataClient`.
 *
 * See `docs/2026-05-27-amplify-to-hono-migration-plan.md` §10.5 (Phase 3).
 */

import { env } from '$amplify/env/hono-heavy';
import { configureDataClient, type HonoDataClient } from '../../shared/data-client';

export const dataClient: HonoDataClient = await configureDataClient(env);
