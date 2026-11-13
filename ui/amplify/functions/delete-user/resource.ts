import { defineFunction } from "@aws-amplify/backend";
import { sentryEnv } from "../common/sentry-env";

export const deleteUser = defineFunction({
  name: "delete-user",
  timeoutSeconds: 900, // 15 minutes for comprehensive deletion
  environment: {
    COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID || "",
    AI_TUTOR_STORAGE_BUCKET_NAME: process.env.AI_TUTOR_STORAGE_BUCKET_NAME || "",
    OPENSEARCH_INDEX: process.env.OPENSEARCH_INDEX || "",
    ...sentryEnv,
  },
});

