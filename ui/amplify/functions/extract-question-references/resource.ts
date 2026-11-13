import { defineFunction } from "@aws-amplify/backend";
import { sentryEnv } from "../common/sentry-env";

export const extractQuestionReferences = defineFunction({
  name: "extract-question-references",
  entry: "./handler.ts",
  timeoutSeconds: 900,
  memoryMB: 2048,
  environment: {
    AWS_BRANCH: process.env.AWS_BRANCH || "local",
    ...sentryEnv,
  },
  logging: {
    format: "json",
    level: "debug",
    retention: "1 day",
  },
});

