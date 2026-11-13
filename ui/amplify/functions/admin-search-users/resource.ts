import { defineFunction } from "@aws-amplify/backend";
import { sentryEnv } from "../common/sentry-env";

export const adminSearchUsers = defineFunction({
  name: "admin-search-users",
  entry: "./handler.ts",
  environment: {
    AWS_BRANCH: process.env.AWS_BRANCH || "local",
    ...sentryEnv,
  },
});


