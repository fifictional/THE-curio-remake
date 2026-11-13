import { defineFunction } from '@aws-amplify/backend';
import { sentryEnv } from '../common/sentry-env';

export const enqueueMemoryEvent = defineFunction({
  name: 'enqueue-memory-event',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
  environment: {
    ...sentryEnv,
  },
});
