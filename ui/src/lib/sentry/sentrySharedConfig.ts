import type { ErrorEvent, EventHint } from "@sentry/core";

/**
 * Shared scrubbing for client, server, edge, and Lambda. Keeps Sentry events
 * free of common PII (cookies, auth headers, raw query strings).
 */
export function sentryBeforeSend(
  event: ErrorEvent,
  _hint: EventHint,
): ErrorEvent | null {
  if (event.request) {
    const req = { ...event.request };
    delete req.cookies;
    if (req.headers) {
      const headers = { ...req.headers } as Record<string, string>;
      delete headers["Cookie"];
      delete headers["cookie"];
      delete headers["Authorization"];
      delete headers["authorization"];
      req.headers = headers;
    }
    if (req.query_string) {
      req.query_string = "[Redacted]";
    }
    event.request = req;
  }
  return event;
}

export function getSentryEnvironment(): string {
  return (
    process.env.SENTRY_ENVIRONMENT ||
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    "development"
  );
}

export function getSentryRelease(): string | undefined {
  return (
    process.env.SENTRY_RELEASE ||
    process.env.NEXT_PUBLIC_SENTRY_RELEASE ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
  );
}

/** Lower tracing volume in production; full sampling in dev. */
export function getTracesSampleRate(): number {
  if (process.env.NODE_ENV === "development") {
    return 1;
  }
  const raw = process.env.SENTRY_TRACES_SAMPLE_RATE;
  if (raw !== undefined && raw !== "") {
    const n = Number(raw);
    if (!Number.isNaN(n)) {
      return Math.min(1, Math.max(0, n));
    }
  }
  return 0.1;
}

export function getProfilesSampleRate(): number {
  if (process.env.NODE_ENV === "development") {
    return 0;
  }
  const raw = process.env.SENTRY_PROFILES_SAMPLE_RATE;
  if (raw !== undefined && raw !== "") {
    const n = Number(raw);
    if (!Number.isNaN(n)) {
      return Math.min(1, Math.max(0, n));
    }
  }
  return 0;
}
