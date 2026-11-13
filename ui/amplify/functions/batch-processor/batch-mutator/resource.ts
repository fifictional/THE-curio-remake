import { defineFunction, secret } from "@aws-amplify/backend";
import { sentryEnv } from "../../common/sentry-env";

export const batchMutator = defineFunction({
  name: "batch-mutator",
  timeoutSeconds: 900, // 15 minutes
  memoryMB: 1024,
  resourceGroupName: "data", // Assign to data stack to avoid circular dependency with allow.resource()
  environment: {
    MIXPANEL_TOKEN: secret('MIXPANEL_TOKEN'),
    MIXPANEL_API_HOST: process.env.MIXPANEL_API_HOST || '',
    ...sentryEnv,
  },
});
