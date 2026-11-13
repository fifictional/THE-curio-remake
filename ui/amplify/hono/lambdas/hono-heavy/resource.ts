import { defineFunction, secret } from '@aws-amplify/backend';
import { sentryEnv } from '../../../functions/common/sentry-env';

/**
 * Hono-Heavy Lambda — consolidates 13 heavy GraphQL-backed Lambdas
 * plus the `batchCreator` EventBridge cron entry.
 *
 * Phase 0 scaffold per `docs/2026-05-27-amplify-to-hono-migration-plan.md` §10.2.
 * Routes are added incrementally in Phase 3 (§10.5).
 *
 * Sizing decision (§4.1): 900s timeout / 2048 MB, no VPC. Matches the
 * heaviest current op (extractQuestionReferences, satExtractAnswers at
 * 900s/2048MB). ai-chat is over-provisioned at this size but the cost
 * delta is negligible — see `docs/migration-baselines/ai-chat-memory-baseline-2026-05-28.md`.
 *
 * `ANTHROPIC_API_KEY` is declared here at scaffold time per PF-4 (§6.5 #4).
 * Today `generate-question-answer` lacks this grant; consolidation auto-fixes it.
 * Additional secrets (MIXPANEL_TOKEN, OPENAI_API_KEY, plain env vars) get added
 * in Phase 3 as routes land (P3-14 = union-of-env across all 13 routes).
 */
export const honoHeavy = defineFunction({
  name: 'hono-heavy',
  entry: './index.ts',
  timeoutSeconds: 900,
  memoryMB: 2048,
  environment: {
    ...sentryEnv,
    ANTHROPIC_API_KEY: secret('ANTHROPIC_API_KEY'),
    OPENAI_API_KEY: secret('OPENAI_API_KEY'),
    MIXPANEL_TOKEN: secret('MIXPANEL_TOKEN'),
    MIXPANEL_API_HOST: process.env.MIXPANEL_API_HOST || '',
    AWS_BRANCH: process.env.AWS_BRANCH || 'local',
    MAX_FREE_FLASHCARD_GENERATIONS: process.env.NEXT_PUBLIC_MAX_FREE_FLASHCARD_GENERATIONS || '5',
    MAX_FREE_QUIZ_GENERATIONS: process.env.NEXT_PUBLIC_MAX_FREE_QUIZ_GENERATIONS || '5',
    MAX_FREE_WEB_SEARCH_GENERATIONS: process.env.NEXT_PUBLIC_MAX_FREE_WEB_SEARCH_GENERATIONS || '5',
    MAX_FREE_PRACTICE_TEST_GENERATIONS: process.env.NEXT_PUBLIC_MAX_FREE_PRACTICE_TEST_GENERATIONS || '5',
    MAX_MESSAGE_LENGTH: process.env.NEXT_PUBLIC_MAX_MESSAGE_LENGTH || '255',
    MAX_PREMIUM_MESSAGES: process.env.NEXT_PUBLIC_MAX_PREMIUM_MESSAGES || '5',
    MAX_NORMAL_MESSAGES: process.env.NEXT_PUBLIC_MAX_NORMAL_MESSAGES || '25',
    TIME_TO_RESET_MESSAGE_LIMIT_IN_HOURS: process.env.NEXT_PUBLIC_TIME_TO_RESET_MESSAGE_LIMIT_IN_HOURS || '1',
    RAG_ENABLED: process.env.RAG_ENABLED || 'true',
    MAX_RECENT_CHAT_TURNS: process.env.MAX_RECENT_CHAT_TURNS || '20',
  },
  logging: {
    format: 'json',
    level: 'info',
    retention: '1 day',
  },
});
