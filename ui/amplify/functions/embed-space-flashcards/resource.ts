import { defineFunction } from "@aws-amplify/backend";
import { sentryEnv } from "../common/sentry-env";

export const embedSpaceFlashcards = defineFunction({
  name: "embed-space-flashcards",
  entry: "./handler.ts",
  timeoutSeconds: 300,
  memoryMB: 512,
  environment: {
    ...sentryEnv,
  },
});
