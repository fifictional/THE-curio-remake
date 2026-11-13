import * as Sentry from "@sentry/nextjs";
import {
  getSentryEnvironment,
  getSentryRelease,
  getTracesSampleRate,
  sentryBeforeSend,
} from "@/lib/sentry/sentrySharedConfig";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  environment: getSentryEnvironment(),
  release: getSentryRelease(),
  sendDefaultPii: false,
  tracesSampleRate: getTracesSampleRate(),
  beforeSend: sentryBeforeSend,
  // Browser extensions, ad blockers and ResizeObserver loops are pure noise and
  // were eating the ingest budget (429s). Drop them client-side.
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error promise rejection captured",
    /Loading chunk \d+ failed/,
    /ChunkLoadError/,
  ],
  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
