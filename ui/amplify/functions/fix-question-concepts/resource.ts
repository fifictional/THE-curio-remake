import { defineFunction, secret } from '@aws-amplify/backend';
import { sentryEnv } from '../common/sentry-env';

export const fixQuestionConcepts = defineFunction({
  name: 'fix-question-concepts',
  entry: './handler.ts',
  timeoutSeconds: 900, // 15 minutes - can process many questions
  memoryMB: 512,
  environment: {
    ANTHROPIC_API_KEY: secret('ANTHROPIC_API_KEY'),
    ...sentryEnv,
  },
});

