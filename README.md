# Curio — remake

Open-source rewrite of Curio. Hono API on Node, Postgres, Better Auth, Qdrant.
Replaces the Amplify + AppSync + Lambda + DynamoDB stack.

## Run

```bash
cp .env.example .env      # add OPENAI_API_KEY
npm run db:up             # postgres + qdrant in docker
npm run dev               # http://localhost:3101
npm test
```

## Tests

```bash
npm test          # 41 tests (integration skips without a DB)
npm run qdrant:smoke
```

The integration suite runs against real Postgres and real Better Auth. It
asserts the auth boundary (anonymous / owner / other user) **and** that
isolation is enforced by Postgres RLS itself, not just by route guards.

CI (`.github/workflows/ci.yml`) runs both packages with Postgres + Qdrant
service containers.

## State

- `server/` — Hono API on plain Node, real routes ported from the old repo.
- Postgres: **all 44 DynamoDB models have a table**, RLS enabled + forced on 43 of them,
  and an audit suite (`server/rls.test.ts`) fails if a new table is added without a policy.
- Auth: Better Auth, session cookie; imported Cognito users attach a local
  password with `npm run migrate:adopt`.
- Dev data is migrated: 13,673 rows across 29 non-empty tables, 299 storage
  objects. Production is still blocked on the decisions in
  `docs/migration-runbook.md` §5.
- `ui/` is the original frontend (strangler); `web/` is the TanStack Start
  replacement, chat screen only.
- `docs/adr/` — 0001 data layer, 0002 data model + migration, 0003 ERD, 0004 strangler UI.
- **Out of scope (2026-11-17):** practice/mock tests, learning profile, SAT prep.
  Their tables are migrated but the features are not built — see `docs/decisions.md`.

## Decisions

See `docs/decisions.md`.

## What works now

```bash
npm run db:up        # postgres:5433 + qdrant
npm run db:migrate   # apply server/db/migrations/*.sql
npm run db:seed      # one user, two spaces, one chat, 2 messages
npm run dev          # http://localhost:3101
```

| Endpoint | Does |
|---|---|
| `GET /messages?chat=<uuid>` | chat history from Postgres |
| `POST /messages` | insert a message |
| `POST /moveChat` | the real ported route — moves a chat + its flashcards/questions between spaces |
| `GET /__hello` | smoke check |
| `GET /rag/search?q=&chat=` | vector search (needs OPENAI_API_KEY) |
| `GET /me` | current user (401 if signed out) |
| `POST /api/auth/sign-up/email` | Better Auth sign-up |
| `POST /api/auth/sign-in/email` | Better Auth sign-in (sets cookie) |
| `POST /api/auth/sign-out` | sign out |

The page at `/` lists real rows and lets you move the chat between spaces.

Uploading a document runs the local pipeline: `.local/files` → Document + Task →
polling worker → text extraction → summary → **chunks embedded into Qdrant**. PDFs
are read from their text layer (`server/pdf.ts`); scans have no text layer and need
OCR/Datalab.

`/aiChat` then retrieves the student's own chunks before answering and writes a
`chat_citations` row per source document, which the chat's **Sources** tab renders.

Retrieval has two paths, and **the keyless one is real**: with `OPENAI_API_KEY`
it searches Qdrant vectors; without it, Postgres full-text search (`to_tsvector` /
`websearch_to_tsquery`, with an OR fallback so questions match). Backfill existing
documents with `POST /rag/reindex {"all": true}`.

Three database roles: the migrating **owner**, `curio_app` (requests, NOBYPASSRLS)
and `curio_service` (worker + indexer, BYPASSRLS). `npm run db:rls` creates the
last two.

Seeded ids: chat `44444444-4444-4444-8444-444444444444`, spaces `2222…` (Biology) and `3333…` (Chemistry).

## Auth

Better Auth, email + password, session cookie. Every request resolves a session;
`/messages` returns 401 without one and 404 for a chat you don't own.

Local login after `npm run db:seed`: `local@curio.test` / `localpassword123`.

**User migration:** the auth user id *is* the legacy `userUuid` value
(`users.id` property maps to the `user_uuid` column), so importing Cognito
users is an id mapping — no child-table rewrite.

## UI

**Run the UI in production mode for realistic speed** — `next dev` compiles
~9,400 modules per route (1–14 s on first visit):

```bash
npm run ui:build   # next build (ui)
npm run ui:start   # next start on :3300
```


`web/` is **TanStack Start** (v1) with file-based routes and TanStack Query:

```
web/src/routes/__root.tsx        document shell + <Outlet/>
web/src/routes/index.tsx         the chat page (server-rendered)
web/src/server/api.ts            server functions: session + first chat + messages
web/src/server/fetch.server.ts   forwards the request cookie to the API
web/src/router.tsx               getRouter()
web/src/components/chat-app.tsx  the surface
web/src/api.ts                   TanStack Query hooks for mutations + refresh
```

**SSR works**: the route loader (a server function) forwards the session cookie to
the API on :3101 and returns the session, the user's first chat and its messages,
so the first paint is the real conversation — no `ssr: false`, no "checking
session" flash. Signed out, the server renders the sign-in card. The dev server
still proxies the API so browser fetches stay same-origin.

Messages render **markdown and maths** (`web/src/lib/markdown.tsx`): react-markdown
+ GFM + raw HTML, and KaTeX for `$…$` / `$$…$$` after normalising the model's
`\(…\)` / `\[…\]` delimiters. KaTeX instead of MathJax on purpose — MathJax v3
needs every typeset call serialised, which was a real bug on the `ui/` side.

Screens: **chat**, **library** (`/library` — search, real documents, upload) and
**document** (`/documents/<uuid>` — metadata, "open file", rendered summary). All
three are server-rendered and gated by the session card.

Screens so far: **chat** (`/?chat=<uuid>` deep-links a conversation, with a Sources
panel and 4s polling), **library**, **document** (summary + read-only study
material), **spaces** (`/spaces/<id>`), **settings** (export + delete account) and
**forgot/reset password**. All server-rendered, all gated by the session card.

Two proxy/route traps, both already paid for: the Vite dev proxy must list every API
path (a missing entry is a 404 from Vite, not the API), but it must **not** cover
paths that are also app routes — `/documents/<uuid>` is a screen, so the browser
creates documents through `/api/documents` (same handler on the server). And the
`/db` bridge reports errors in-band (`{data, errors}`), so the server fetchers
honour that instead of throwing: a stale link renders "not found", not a 500.

Still missing in `web/`: generating flashcards/quizzes (the chat tools that produce
them are not ported), transcription/YouTube flows, and full parity with `ui/` per
ADR 0004.

Login after seeding: `local@curio.test` / `localpassword123`.

## Verification

Two sweeps, both self-cleaning (they create their own users, data and files, then
delete the accounts, so the database is unchanged afterwards):

```bash
npm run verify:api     # 46 checks over HTTP: auth boundary, bridge, files,
                       # retrieval, and the upload → worker → summary → citation path
npm run verify:web     # browser checks for the new UI (needs it on :5173)
npm run verify         # both
```

`verify:api` needs only the API (`npm start`) plus Postgres and Qdrant; it makes
its own tiny PDF, so nothing has to be seeded. `verify:web` drives Playwright
through `ui/` (the dependency lives there), signs up a throwaway account and
checks: signed-out gates, empty states, bad ids as "not found", a chat round-trip,
settings/export, then deletes the account. Set `SMOKE_EMAIL`/`SMOKE_PASSWORD` to
also check the seeded data path.

CI runs `verify:api` after the unit suite; the browser sweep stays local because it
needs the UI servers.

## Smoke test (legacy UI on real data)

Walks the migrated screens and fails on uncaught errors, console errors, 5xx or an
error boundary. Needs both servers and the migrated database:

```bash
npm start              # API :3101
npm --prefix ui run build && npm --prefix ui run start   # UI :3300
npm run smoke
```

It prints a table per screen (`/db` rows fetched, response size) plus a list of
expected 404s from features we have decided to drop (e.g. `/learningProfileQuery`),
so a real regression is not hidden among them.

## Qdrant

`npm run qdrant:smoke` upserts three points, searches with a payload filter and
asserts users cannot see each other's vectors. Without `OPENAI_API_KEY` it uses
a deterministic pseudo-vector, so the wire format is proven but *semantic*
quality is not — that needs a real key.

Qdrant is published on **6433** (6333 was taken by another local container).

## Seam

`server/data-client.ts` is the interface; `server/postgres-data.ts` and
`server/fake-data.ts` are two implementations. Routes never import SQL.
