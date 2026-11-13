import { defineFunction, secret } from '@aws-amplify/backend';
import { sentryEnv } from '../common/sentry-env';

export const processDocumentUpdateTaskStatus = defineFunction({
  name: 'process-document-update-task-status',
  entry: './handler.ts',
  environment: {
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

