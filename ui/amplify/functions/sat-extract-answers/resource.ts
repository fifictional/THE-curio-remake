import { defineFunction } from '@aws-amplify/backend';
import { sentryEnv } from '../common/sentry-env';

export const satExtractAnswers = defineFunction({
  name: 'sat-extract-answers',
  timeoutSeconds: 900, // 15 minutes for processing multiple modules
  memoryMB: 2048,
  entry: './handler.ts',
  runtime: 20,
  environment: {
    NODE_OPTIONS: '--enable-source-maps',
    ...sentryEnv,
  },
  logging: {
    format: 'json',
    level: 'debug',
    retention: '1 day',
  },
});

