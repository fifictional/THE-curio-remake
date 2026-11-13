import { defineFunction } from "@aws-amplify/backend";
import { sentryEnv } from "../common/sentry-env";

export const extractAndEmbedLambda = defineFunction({
  name: "extract-and-embed",
  entry: "./handler.ts",
  environment: {
    OPENSEARCH_INDEX: "rags-index",
    ...sentryEnv,
  },
  timeoutSeconds: 900,
});
