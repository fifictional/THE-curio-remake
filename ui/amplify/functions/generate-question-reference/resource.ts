import { defineFunction, secret } from "@aws-amplify/backend";
import { sentryEnv } from "../common/sentry-env";

export const generateQuestionReference = defineFunction({
  name: "generate-question-reference",
  entry: "./handler.ts",
  timeoutSeconds: 300,
  memoryMB: 1024,
  environment: {
    AWS_BRANCH: process.env.AWS_BRANCH || "local",
    ANTHROPIC_API_KEY: secret('ANTHROPIC_API_KEY'),
    OPENAI_API_KEY: secret('OPENAI_API_KEY'),
    ...sentryEnv,
  },
  logging: {
    format: "json",
    level: "debug",
    retention: "1 day",
  },
});

