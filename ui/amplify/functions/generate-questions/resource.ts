import { defineFunction, secret } from '@aws-amplify/backend';
import { sentryEnv } from '../common/sentry-env';

export const generateQuestions = defineFunction({
  name: 'generate-questions',
  entry: './handler.ts',
  timeoutSeconds: 900, // 15 minutes
  memoryMB: 2048,
  environment: {
    AWS_BRANCH: process.env.AWS_BRANCH || "local",
    ANTHROPIC_API_KEY: secret('ANTHROPIC_API_KEY'),
    ...sentryEnv,
  },
  logging: {
    format: 'json',
    level: 'debug',
    retention: '1 day',
  },
});

