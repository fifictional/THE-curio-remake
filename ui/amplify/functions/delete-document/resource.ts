import { defineFunction } from "@aws-amplify/backend";
import { sentryEnv } from "../common/sentry-env";

export const deleteDocument = defineFunction({
  name: "delete-document",
  timeoutSeconds: 300,
  environment: {
    ...sentryEnv,
  },
});