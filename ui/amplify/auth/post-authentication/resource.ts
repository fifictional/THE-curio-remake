import { defineFunction, secret } from '@aws-amplify/backend';

const currentBranch = process.env.AWS_BRANCH || "local";

export const postAuthentication = defineFunction({
  name: 'post-authentication',
  resourceGroupName: 'auth',
  environment: {
    SYNC_TO_LOOPS: currentBranch === 'release' ? 'true' : 'false',
    LOOPS_API_KEY: secret('LOOPS_API_KEY'),
    SYNC_TO_CUSTOMERIO: currentBranch === 'release' ? 'true' : 'false',
    CUSTOMERIO_API_KEY: secret('CUSTOMERIO_API_KEY')
  },
  logging: {
    format: "json",
    level: "debug",
    retention: "1 day",
  },
});