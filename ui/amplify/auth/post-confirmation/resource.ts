import { defineFunction } from '@aws-amplify/backend';
import { secret } from "@aws-amplify/backend";

const currentBranch = process.env.AWS_BRANCH || "local";

export const postConfirmation = defineFunction({
  name: 'post-confirmation',
  resourceGroupName: 'auth',
  environment: {
    AWS_BRANCH: currentBranch,
    SYNC_TO_LOOPS: currentBranch === 'release' ? 'true' : 'false',
    LOOPS_API_KEY: secret('LOOPS_API_KEY'),
    MIXPANEL_TOKEN: secret('MIXPANEL_TOKEN'),
    MIXPANEL_API_HOST: process.env.MIXPANEL_API_HOST || '',
    META_PIXEL_ID: currentBranch === 'release' ? process.env.META_PIXEL_ID || '' : '',
    META_ACCESS_TOKEN: currentBranch === 'release' ? process.env.META_ACCESS_TOKEN || '' : '',
    SYNC_TO_CRM: currentBranch === 'release' ? 'true' : 'false',
    SYNC_TO_CUSTOMERIO: currentBranch === 'release' ? 'true' : 'false',
    CUSTOMERIO_API_KEY: secret('CUSTOMERIO_API_KEY'),
  },
  logging: {
    format: "json",
    level: "debug",
    retention: "1 day",
  },
});