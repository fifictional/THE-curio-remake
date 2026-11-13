import { defineFunction, secret } from '@aws-amplify/backend';
import { sentryEnv } from '../common/sentry-env';

export const processDocumentFileTypeDetection = defineFunction({
  name: 'process-document-file-type-detection',
  entry: './handler.ts',
  timeoutSeconds: 300,
  memoryMB: 512,
  resourceGroupName: 'data', // Assign to data stack to avoid circular dependency with data API access
  environment: {
    AWS_BRANCH: process.env.AWS_BRANCH || 'local',
    ANTHROPIC_API_KEY: secret('ANTHROPIC_API_KEY'),
    ...sentryEnv,
  },
  logging: {
    format: 'json',
    level: 'debug',
    retention: '1 day',
  },
});

