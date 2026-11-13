import { defineFunction } from "@aws-amplify/backend";
import { sentryEnv } from "../common/sentry-env";

export const retrieveDatalabQuery = defineFunction({
  name: "retrieve-datalab-query",
  timeoutSeconds: 60, // 1 minute should be enough for ad-hoc queries
  environment: {
    ...sentryEnv,
  },
  logging: {
    format: 'json',
    level: 'debug',
    retention: '1 day',
  },
});

