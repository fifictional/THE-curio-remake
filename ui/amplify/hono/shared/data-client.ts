import type { Schema } from '@database-schema';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { Amplify } from 'aws-amplify';
import { generateClient, type Client } from 'aws-amplify/api';

/**
 * Configure Amplify + return a typed AppSync data client.
 *
 * Mirrors the pattern used by every existing Lambda handler under
 * `amplify/functions/*` (see e.g. `amplify/functions/move-document/handler.ts:1-15`).
 *
 * Usage in each Hono Lambda entry:
 *
 * ```ts
 * import { env } from '$amplify/env/hono-light';
 * import { configureDataClient } from '../../shared/data-client';
 * export const dataClient = await configureDataClient(env);
 * ```
 *
 * The returned client is intended to be a module-level singleton, configured
 * once per cold start. Route handlers import it from their Lambda's `data.ts`.
 *
 * `authMode` is intentionally NOT set — existing Lambdas rely on the Lambda's
 * IAM role being granted by `allow.resource(...)` in `amplify/data/resource.ts`,
 * which is wired up for the 3 Hono Lambdas in P0-7.
 */
export type HonoDataClient = Client<Schema>;

export async function configureDataClient(env: unknown): Promise<HonoDataClient> {
  const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env as never);
  Amplify.configure(resourceConfig, libraryOptions);
  return generateClient<Schema>();
}
