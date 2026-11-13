import { defineFunction } from "@aws-amplify/backend";
import { sentryEnv } from "../common/sentry-env";

export const moveChat = defineFunction({
  name: "move-chat",
  timeoutSeconds: 300,
  environment: {
    ...sentryEnv,
  },
});