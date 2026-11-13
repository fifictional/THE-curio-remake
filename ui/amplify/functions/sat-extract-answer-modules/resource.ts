import { defineFunction, secret } from '@aws-amplify/backend';
import { sentryEnv } from '../common/sentry-env';

export const satExtractAnswerModules = defineFunction({
  name: 'sat-extract-answer-modules',
  entry: './handler.ts',
  timeoutSeconds: 900, // 15 minutes
  memoryMB: 2048,
  environment: {
    AWS_BRANCH: process.env.AWS_BRANCH || "local",
    ...sentryEnv,
  },
  logging: {
    format: 'json',
    level: 'debug',
    retention: '1 day',
  },
});

