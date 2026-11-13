import { defineFunction, secret } from '@aws-amplify/backend';
import { sentryEnv } from '../common/sentry-env';

export const processDocumentDatalabRetrieve = defineFunction({
  name: 'process-document-datalab-retrieve',
  entry: './handler.ts',
  timeoutSeconds: 900,
  memoryMB: 1024,
  environment: {
    AWS_BRANCH: process.env.AWS_BRANCH || 'local',
    DATALAB_API_KEY: secret('DATALAB_API_KEY'),
    DATALAB_API_URL: process.env.DATALAB_API_URL || 'https://www.datalab.to',
    ...sentryEnv,
  },
  logging: {
    format: 'json',
    level: 'debug',
    retention: '1 day',
  },
});

