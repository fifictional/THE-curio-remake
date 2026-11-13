import { defineFunction, secret } from '@aws-amplify/backend';
import { sentryEnv } from '../common/sentry-env';

const currentBranch = process.env.AWS_BRANCH || "local";

export const transactionCompleted = defineFunction({
  name: 'transaction-completed',
  timeoutSeconds: 30,
  environment: {
    ENVIRONMENT: currentBranch === 'release' ? 'prod' : 'dev',
    PADDLE_SECRET: secret('PADDLE_SECRET_TRANSACTION'),
    PADDLE_API_KEY: secret('PADDLE_API_KEY'),
    ULTRA_CURIO_PRODUCT_ID: process.env.ULTRA_CURIO_PRODUCT_ID || 'pro_01k9shd07jh81w79bja6prz7fp',
    ...(currentBranch === 'release' && { 
      CUSTOMERIO_API_KEY: secret('CUSTOMERIO_API_KEY'),
      MIXPANEL_TOKEN: secret('MIXPANEL_TOKEN'),
    }),
    MIXPANEL_API_HOST: process.env.MIXPANEL_API_HOST || '',
    ...sentryEnv,
  },
  logging: {
    format: "json",
    level: "debug",
    retention: "1 day",
  },
});

