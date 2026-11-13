import { defineFunction } from "@aws-amplify/backend";
import { sentryEnv } from "../common/sentry-env";

export const satQuestionExtractor = defineFunction({
  name: "sat-question-extractor",
  entry: "./handler.ts",
  timeoutSeconds: 900, // 15 minutes for processing
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

