import { defineFunction } from '@aws-amplify/backend';
import { secret } from "@aws-amplify/backend";

const currentBranch = process.env.AWS_BRANCH || "local";

export const preSignUp = defineFunction({
  name: 'pre-signup',
  resourceGroupName: 'auth',
  environment: {
    AWS_BRANCH: currentBranch,
    SYNC_TO_LOOPS: currentBranch === 'release' ? 'true' : 'false',
    LOOPS_API_KEY: secret('LOOPS_API_KEY'),
    SYNC_TO_CUSTOMERIO: currentBranch === 'release' ? 'true' : 'false',
    CUSTOMERIO_API_KEY: secret('CUSTOMERIO_API_KEY'),
    MIXPANEL_TOKEN: secret('MIXPANEL_TOKEN'),
    MIXPANEL_API_HOST: process.env.MIXPANEL_API_HOST || '',
  },
  logging: {
    format: "json",
    level: "debug",
    retention: "1 day",
  },
});