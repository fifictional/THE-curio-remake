import { defineFunction } from "@aws-amplify/backend";
import { sentryEnv } from "../common/sentry-env";

export const generateQuestionAnswer = defineFunction({
  name: "generate-question-answer",
  entry: "./handler.ts",
  timeoutSeconds: 300,
  memoryMB: 1024,
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

