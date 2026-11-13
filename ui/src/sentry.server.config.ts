import * as Sentry from "@sentry/nextjs";
import {
  getProfilesSampleRate,
  getSentryEnvironment,
  getSentryRelease,
  getTracesSampleRate,
  sentryBeforeSend,
} from "@/lib/sentry/sentrySharedConfig";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  environment: getSentryEnvironment(),
  release: getSentryRelease(),
  sendDefaultPii: false,
  tracesSampleRate: getTracesSampleRate(),
  profilesSampleRate: getProfilesSampleRate(),
  beforeSend: sentryBeforeSend,
});
