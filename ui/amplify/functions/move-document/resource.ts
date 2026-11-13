import { defineFunction } from "@aws-amplify/backend";
import { sentryEnv } from "../common/sentry-env";

export const moveDocument = defineFunction({
  name: "move-document",
  timeoutSeconds: 300,
  environment: {
    ...sentryEnv,
  },
});