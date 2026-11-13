import { defineFunction } from '@aws-amplify/backend';
import { sentryEnv } from '../common/sentry-env';

export const fulfillPurchase = defineFunction({
  name: 'fulfill-purchase',
  timeoutSeconds: 30,
  environment: {
    ...sentryEnv,
  },
});

