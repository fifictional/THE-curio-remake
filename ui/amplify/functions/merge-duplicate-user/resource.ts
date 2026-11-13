import { defineFunction } from "@aws-amplify/backend";
import { sentryEnv } from "../common/sentry-env";

export const mergeDuplicateUser = defineFunction({
  name: "merge-duplicate-user",
  timeoutSeconds: 900,
  memoryMB: 1024,
  environment: {
    COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID || "",
    ...sentryEnv,
  },
});
