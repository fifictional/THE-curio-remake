import { defineFunction, secret } from '@aws-amplify/backend';
import { sentryEnv } from '../common/sentry-env';

const currentBranch = process.env.AWS_BRANCH || "local";

export const subscriptionUpdate = defineFunction({
  name: 'subscription-update',
  timeoutSeconds: 30,
  environment: {
    ENVIRONMENT: currentBranch === 'release' ? 'prod' : 'dev',
    PADDLE_SECRET: secret('PADDLE_SECRET_SUBS'),
    PADDLE_API_KEY: secret('PADDLE_API_KEY'),
    MIXPANEL_TOKEN: secret('MIXPANEL_TOKEN'),
    MIXPANEL_API_HOST: process.env.MIXPANEL_API_HOST || '',
    ...(currentBranch === 'release' && { CUSTOMERIO_API_KEY: secret('CUSTOMERIO_API_KEY') }),
    ...(currentBranch === 'release' && { LOOPS_API_KEY: secret('LOOPS_API_KEY') }),
    SUPER_CURIO_PRODUCT_ID: process.env.SUPER_CURIO_PRODUCT_ID || 'pro_01k71nbhcnxgr2qzbsqqy7pgpw',
    ULTRA_CURIO_PRODUCT_ID: process.env.ULTRA_CURIO_PRODUCT_ID || 'pro_01k9shd07jh81w79bja6prz7fp',
    META_PIXEL_ID: currentBranch === 'release' ? process.env.META_PIXEL_ID || '' : '',
    META_ACCESS_TOKEN: currentBranch === 'release' ? process.env.META_ACCESS_TOKEN || '' : '',
    ...sentryEnv,
  },
  logging: {
    format: "json",
    level: "debug",
    retention: "1 day",
  },
});
