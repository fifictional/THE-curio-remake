import { defineFunction } from "@aws-amplify/backend";
import { sentryEnv } from "../common/sentry-env";

export const questionBankBackup = defineFunction({
  name: "question-bank-backup",
  timeoutSeconds: 300, // 5 minutes
  memoryMB: 256,
  resourceGroupName: 'data', // Assign to data stack to avoid circular dependency
  environment: {
    ...sentryEnv,
  },
});
