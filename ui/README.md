## AWS Amplify Next.js (App Router) Starter Template

This repository provides a starter template for creating applications using Next.js (App Router) and AWS Amplify, emphasizing easy setup for authentication, API, and database capabilities.

## Overview

This template equips you with a foundational Next.js application integrated with AWS Amplify, streamlined for scalability and performance. It is ideal for developers looking to jumpstart their project with pre-configured AWS services like Cognito, AppSync, and DynamoDB.

## Features

- **Authentication**: Setup with Amazon Cognito for secure user authentication.
- **API**: Ready-to-use GraphQL endpoint with AWS AppSync.
- **Database**: Real-time database powered by Amazon DynamoDB.

## Deploying to AWS

For detailed instructions on deploying your application, refer to the [deployment section](https://docs.amplify.aws/nextjs/start/quickstart/nextjs-app-router-client-components/#deploy-a-fullstack-app-to-aws) of our documentation.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## Sentry (error monitoring)

Configure Sentry via environment variables only; do not commit DSNs or auth tokens.

| Variable | Where | Purpose |
|----------|--------|---------|
| `NEXT_PUBLIC_SENTRY_DSN` | Next.js (browser + optional server fallback) | Public DSN for client SDK |
| `SENTRY_DSN` | Next.js server / Lambda | Server-side DSN (can match frontend project or use a backend project) |
| `SENTRY_ENVIRONMENT` | Next + Lambda | e.g. `development`, `staging`, `production` (falls back to `VERCEL_ENV` or `NODE_ENV`) |
| `SENTRY_RELEASE` | Next + Lambda | Git SHA or build id; falls back to `VERCEL_GIT_COMMIT_SHA` / `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` on Vercel |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | CI / production build | Source map upload (`SENTRY_AUTH_TOKEN` must stay secret) |
| `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_PROFILES_SAMPLE_RATE` | Next.js | Optional; defaults to 0.1 traces / 0 profiles in production |

**Amplify:** Store `SENTRY_DSN` in Amplify secrets as `SENTRY_DSN` (wired into every Lambda under `amplify/functions/**` via `amplify/functions/common/sentry-env.ts`). `SENTRY_RELEASE` and `SENTRY_ENVIRONMENT` are applied to all those functions in `amplify/backend.ts` from the branch and optional `AWS_COMMIT_ID` / `SENTRY_ENVIRONMENT`.

**Verify**

1. **Browser:** With DSN set, use a button that throws (see [Sentry Next.js docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)) or trigger an error in the app.
2. **Next server:** In non-production, call `GET /api/sentry-test?throw=1` — expect an issue in Sentry.
3. **Lambda:** Invoke a function that throws (e.g. `deleteChat` without `chatUuid`) in staging, or temporarily throw after Sentry init — events should appear with the same `environment` / `release` as configured above.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.