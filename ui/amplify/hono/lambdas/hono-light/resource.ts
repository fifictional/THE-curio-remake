import { defineFunction } from '@aws-amplify/backend';
import { sentryEnv } from '../../../functions/common/sentry-env';

/**
 * Hono-Light Lambda — consolidates 7 light GraphQL-backed Lambdas.
 *
 * Phase 0 scaffold per `docs/2026-05-27-amplify-to-hono-migration-plan.md` §10.2.
 * Routes are added incrementally in Phase 2 (§10.4). For now this Lambda
 * is registered with a placeholder handler that returns 404 for any path.
 *
 * Sizing decision (§4.1): 60s timeout / 512 MB, no VPC. Right-sized for the
 * 7 ops it will host: adminSearchUsers, fulfillPurchase, enqueueMemoryEvent,
 * clearUserMemory, exportLearningProfile, runMemoryBackfill, deleteChat.
 *
 * Sentry env declared here closes the historical gap (§6.5 #7) where 4 of
 * those 7 ops were missing SENTRY_RELEASE/SENTRY_ENVIRONMENT.
 */
export const honoLight = defineFunction({
  name: 'hono-light',
  entry: './index.ts',
  // 300s = max timeout across the 7 Light routes. Original budgets:
  //   adminSearchUsers     default (3s)
  //   fulfillPurchase      30s
  //   enqueueMemoryEvent   30s
  //   clearUserMemory      60s
  //   exportLearningProfile 60s
  //   runMemoryBackfill    300s   ← driver
  //   deleteChat           300s   ← driver (can cascade-delete 1000s of messages)
  // AWS bills on execution time, not configured timeout, so the over-provision
  // for short routes is free. See §10.4 P2-8 for the full env/IAM union.
  timeoutSeconds: 300,
  memoryMB: 512,
  environment: {
    ...sentryEnv,
    AWS_BRANCH: process.env.AWS_BRANCH || 'local',
  },
  logging: {
    format: 'json',
    level: 'info',
    retention: '1 day',
  },
});
