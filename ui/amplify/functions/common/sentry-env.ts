import { secret } from "@aws-amplify/backend";

/** Shared Amplify secret binding so every Lambda receives the same SENTRY_DSN. */
export const sentryEnv = {
  SENTRY_DSN: secret("SENTRY_DSN"),
} as const;
