import type { Handler } from "aws-lambda";
import type { ErrorEvent, EventHint } from "@sentry/core";
import * as Sentry from "@sentry/aws-serverless";

function beforeSend(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
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

let initialized = false;

export function initLambdaSentry(): void {
  if (initialized) {
    return;
  }
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }
  initialized = true;
  const release =
    process.env.SENTRY_RELEASE ||
    process.env.AWS_COMMIT_ID ||
    process.env.VERCEL_GIT_COMMIT_SHA;
  const environment =
    process.env.SENTRY_ENVIRONMENT ||
    (process.env.AWS_BRANCH === "release"
      ? "production"
      : process.env.AWS_BRANCH || "development");

  Sentry.init({
    dsn,
    environment,
    release,
    sendDefaultPii: false,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1 : 0.1,
    beforeSend,
  });
}

/** Call once at module load, then wrap the exported handler. */
export function withSentryLambdaHandler<TEvent, TResult>(
  handler: Handler<TEvent, TResult>,
): Handler<TEvent, TResult> {
  initLambdaSentry();
  return Sentry.wrapHandler(handler);
}
