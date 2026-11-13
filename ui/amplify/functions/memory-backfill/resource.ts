import { defineFunction } from '@aws-amplify/backend';
import { sentryEnv } from '../common/sentry-env';

export const memoryBackfill = defineFunction({
  name: 'memory-backfill',
  resourceGroupName: 'data',
  timeoutSeconds: 300,
  environment: {
    ...sentryEnv,
  },
});
