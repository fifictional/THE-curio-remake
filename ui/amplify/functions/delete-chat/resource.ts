import { defineFunction } from "@aws-amplify/backend";
import { sentryEnv } from "../common/sentry-env";

export const deleteChat = defineFunction({
  name: "delete-chat",
  timeoutSeconds: 300,
  environment: {
    ...sentryEnv,
  },
});