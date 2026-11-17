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
npm test          # 21 tests (integration skips without a DB)
npm run qdrant:smoke
```

The integration suite runs against real Postgres and real Better Auth. It
asserts the auth boundary (anonymous / owner / other user) **and** that
isolation is enforced by Postgres RLS itself, not just by route guards.

CI (`.github/workflows/ci.yml`) runs both packages with Postgres + Qdrant
service containers.

## State

- `server/` — Hono API on plain Node, real routes ported from the old repo.
- Postgres: **all 44 DynamoDB models have a table**, RLS on 37 of them.
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
Requires `OPENAI_API_KEY` for *meaningful* retrieval: without one, vectors are
deterministic pseudo-vectors and retrieval is off unless `RAG_OFFLINE=1` (wiring
checks only). Backfill existing documents with `POST /rag/reindex {"all": true}`.

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
web/src/routes/__root.tsx   document shell + <Outlet/>
web/src/routes/index.tsx    the chat page (ssr: false for now)
web/src/router.tsx          getRouter()
web/src/components/chat-app.tsx
web/src/api.ts              TanStack Query hooks over fetch
```

Start's dev server proxies the API on :3101, so Better Auth's cookie is
same-origin — no CORS. `ssr: false` on the route because app-level SSR needs
cookie forwarding into loaders; that is the next step, not an oversight.

Login after seeding: `local@curio.test` / `localpassword123`.

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
