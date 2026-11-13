import { defineFunction, secret } from '@aws-amplify/backend';
import { sentryEnv } from '../common/sentry-env';

export const processDocumentCategorise = defineFunction({
  name: 'process-document-categorise',
  entry: './handler.ts',
  timeoutSeconds: 300,
  memoryMB: 512,
  environment: {
    AWS_BRANCH: process.env.AWS_BRANCH || 'local',
    ANTHROPIC_API_KEY: secret('ANTHROPIC_API_KEY'),
    MIXPANEL_TOKEN: secret('MIXPANEL_TOKEN'),
    MIXPANEL_API_HOST: process.env.MIXPANEL_API_HOST || '',
    ...sentryEnv,
  },
  logging: {
    format: 'json',
    level: 'debug',
    retention: '1 day',
  },
});

