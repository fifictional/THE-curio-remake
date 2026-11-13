import { defineFunction } from "@aws-amplify/backend";
import { sentryEnv } from "../common/sentry-env";

export const mockExamsGenerateQuestions = defineFunction({
  name: "mock-exams-generate-questions",
  timeoutSeconds: 300,
  environment: {
    ...sentryEnv,
  },
  logging: {
    format: "json",
    level: "debug",
    retention: "1 day",
  },
});