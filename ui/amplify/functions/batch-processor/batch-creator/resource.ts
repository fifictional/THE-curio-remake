import { defineFunction } from "@aws-amplify/backend";
import { sentryEnv } from "../../common/sentry-env";

export const batchCreator = defineFunction({
  name: "batch-creator",
  timeoutSeconds: 900, // 15 minutes
  memoryMB: 512,
  environment: {
    ...sentryEnv,
  },
});

