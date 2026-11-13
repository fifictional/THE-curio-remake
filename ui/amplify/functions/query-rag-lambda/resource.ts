import { defineFunction } from "@aws-amplify/backend";
import { sentryEnv } from "../common/sentry-env";

export const queryRagLambda = defineFunction({
  name: "query-rag",
  entry: "./handler.ts",
  environment: {
    OPENSEARCH_INDEX: "rag-documents",
    ...sentryEnv,
  },
  timeoutSeconds: 600
});
