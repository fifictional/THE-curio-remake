import { defineFunction } from '@aws-amplify/backend';
import { sentryEnv } from '../common/sentry-env';

export const memoryExportPdf = defineFunction({
  name: 'memory-export-pdf',
  resourceGroupName: 'data',
  timeoutSeconds: 60,
  environment: {
    ...sentryEnv,
  },
});
