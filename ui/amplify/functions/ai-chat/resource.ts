import { defineFunction, secret } from "@aws-amplify/backend";
import { sentryEnv } from "../common/sentry-env";

export const aiChat = defineFunction({
  name: "ai-chat",
  timeoutSeconds: 900,
  environment: {
    MIXPANEL_TOKEN: secret("MIXPANEL_TOKEN"),
    MIXPANEL_API_HOST: process.env.MIXPANEL_API_HOST || '',
    ...sentryEnv,
    MAX_FREE_FLASHCARD_GENERATIONS: process.env.NEXT_PUBLIC_MAX_FREE_FLASHCARD_GENERATIONS || '5',
    MAX_FREE_QUIZ_GENERATIONS: process.env.NEXT_PUBLIC_MAX_FREE_QUIZ_GENERATIONS || '5',
    MAX_FREE_WEB_SEARCH_GENERATIONS: process.env.NEXT_PUBLIC_MAX_FREE_WEB_SEARCH_GENERATIONS || '5',
    MAX_FREE_PRACTICE_TEST_GENERATIONS: process.env.NEXT_PUBLIC_MAX_FREE_PRACTICE_TEST_GENERATIONS || '5',
    MAX_MESSAGE_LENGTH: process.env.NEXT_PUBLIC_MAX_MESSAGE_LENGTH || '255',
    MAX_PREMIUM_MESSAGES: process.env.NEXT_PUBLIC_MAX_PREMIUM_MESSAGES || '5',
    MAX_NORMAL_MESSAGES: process.env.NEXT_PUBLIC_MAX_NORMAL_MESSAGES || '25',
    TIME_TO_RESET_MESSAGE_LIMIT_IN_HOURS: process.env.NEXT_PUBLIC_TIME_TO_RESET_MESSAGE_LIMIT_IN_HOURS || '1',
    RAG_ENABLED: process.env.RAG_ENABLED || 'true',
    MEMORY_REFLECTION_QUEUE_URL: process.env.MEMORY_REFLECTION_QUEUE_URL || '',
  },
  logging: {
    format: "json",
    level: "debug",
    retention: "1 day",
  },
});
