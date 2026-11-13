/**
 * Module-level singleton AppSync data client for Hono-Light routes.
 *
 * Mirrors the per-Lambda pattern used by every existing handler (configure
 * Amplify + generate client once per cold start). Routes under
 * `amplify/hono/routes/*` import the `dataClient` value from here.
 *
 * Why a per-Lambda file and not a shared one?
 *  - The `$amplify/env/<lambda-name>` virtual import is generated per-Lambda
 *    and references the exact env wiring on THIS Lambda. Sharing a single
 *    `data.ts` across all 3 Hono Lambdas would couple them or require dynamic
 *    env resolution.
 *  - The shared helper is `amplify/hono/shared/data-client.ts::configureDataClient`.
 *
 * See `docs/2026-05-27-amplify-to-hono-migration-plan.md` §10.3 P1-12 and §5
 * Phase 2 setup notes.
 */

import { env } from '$amplify/env/hono-light';
import { configureDataClient, type HonoDataClient } from '../../shared/data-client';

export const dataClient: HonoDataClient = await configureDataClient(env);
