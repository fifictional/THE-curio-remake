# `server/` — local walking skeleton

The repo's real `moveChat` route, running on plain Node over HTTP, against a
fake database. No Lambda, no AppSync, no AWS credentials, no database.

```bash
npm run dev:server     # → http://localhost:3101
npm test -- server     # 4 tests
```

Open the page, press the button, and `POST /moveChat` runs the same code that
runs in `hono-heavy` in production.

## What is real vs. fake

| Piece | Status |
|---|---|
| `routes/move-chat.ts` | **Real.** Copy of `amplify/hono/routes/move-chat.ts`; only the 3 import paths changed |
| `middleware/validate.ts` | **Real.** Copy of `amplify/hono/shared/middleware/validate.ts` (zod body validation) |
| `data-client.ts` | The **seam**. A 5-method interface that stands in for `Client<Schema>` |
| `fake-data.ts` | **Fake.** Records every call, returns canned rows |
| `types.ts` | Trimmed `HonoEnv` — no `aws-lambda` dependency |
| auth middleware | **Fake.** Identity is always `null`, as in production direct-invoke |
| error boundary | **Trimmed.** Same JSON shape, without Sentry |

## What "swap the database" means here

Write a new object matching `HonoDataClient` (`data-client.ts`) and pass it to
`createApp()`. Nothing else in this folder changes. That is the whole point of
the seam — and it is the question ADR 0001 leaves open.

## What this does NOT test

Postgres vs DynamoDB, realtime/SSE, the document pipeline, the UI in `src/`,
performance, or whether all 638 `client.models.*` call sites can be adapted.
Those need more routes and a real decision.

## Origin

Built as a walking skeleton, not a spike — it is meant to be grown, and to be
copied into a separate repository when the new stack is confirmed.
