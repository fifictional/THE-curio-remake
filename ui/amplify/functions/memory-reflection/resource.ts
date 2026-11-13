import { defineFunction } from '@aws-amplify/backend';
import { sentryEnv } from '../common/sentry-env';

export const memoryReflection = defineFunction({
  name: 'memory-reflection',
  resourceGroupName: 'data',
  timeoutSeconds: 120,
  environment: {
    ...sentryEnv,
  },
  logging: {
    format: 'json',
    level: 'info',
    retention: '1 day',
  },
});
