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


/**
 * Dev-only error relay (remake).
 *
 * A client-side exception shows "Application error" in the browser, but the
 * message only exists in devtools. This posts it to the API so it shows up in
 * the terminal running `npm run dev`. Remove when the legacy UI is retired.
 */
if (typeof window !== 'undefined') {
  const send = (payload: unknown) => {
    try {
      fetch('/log', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch {
      /* ignore */
    }
  };

  window.addEventListener('error', (event) => {
    send({
      kind: 'error',
      message: event.message,
      source: `${event.filename}:${event.lineno}:${event.colno}`,
      stack: (event.error as Error | undefined)?.stack?.slice(0, 2000),
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason as Error | string | undefined;
    send({
      kind: 'unhandledrejection',
      message: typeof reason === 'string' ? reason : reason?.message,
      stack: typeof reason === 'object' ? reason?.stack?.slice(0, 2000) : undefined,
    });
  });
}
