/**
 * Local types — a stand-in for `amplify/hono/shared/types.ts`.
 *
 * Deliberate differences from the Amplify version:
 *   - `identity` is `unknown | null` instead of aws-lambda's `AppSyncIdentity`,
 *     so this server has no dependency on the aws-lambda type package.
 *   - `InvocationType` is declared here instead of imported from
 *     `event-discriminator.ts` (which classifies Lambda event shapes we do not
 *     have outside Lambda).
 *
 * The `Variables` / `Bindings` shape is kept identical so route files copied
 * from `amplify/hono/routes/**` compile unchanged.
 */

export type InvocationType = 'appsync' | 'direct' | 'scheduled';

export interface HonoVariables {
  identity: unknown | null;
  requestId: string;
  invocationType: InvocationType;
}

export interface HonoEnv {
  Variables: HonoVariables;
  Bindings: Record<string, never>;
}
