import { defineFunction } from "@aws-amplify/backend";
import { sentryEnv } from "../common/sentry-env";

export const moveAllUserResources = defineFunction({
  name: "move-all-user-resources",
  timeoutSeconds: 300,
  environment: {
    ...sentryEnv,
  },
});
