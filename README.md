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

## State

- `server/` — Hono API on plain Node. Real routes ported from the old repo,
  database hidden behind `server/data-client.ts`, fake data for now.
- `docs/adr/` — 0001 data layer, 0002 data model + migration, 0003 ERD.
- Postgres schema + Better Auth: next.

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
| `GET /me` | current user (401 if signed out) |
| `POST /api/auth/sign-up/email` | Better Auth sign-up |
| `POST /api/auth/sign-in/email` | Better Auth sign-in (sets cookie) |
| `POST /api/auth/sign-out` | sign out |

The page at `/` lists real rows and lets you move the chat between spaces.

Seeded ids: chat `44444444-4444-4444-8444-444444444444`, spaces `2222…` (Biology) and `3333…` (Chemistry).

## Auth

Better Auth, email + password, session cookie. Every request resolves a session;
`/messages` returns 401 without one and 404 for a chat you don't own.

Local login after `npm run db:seed`: `local@curio.test` / `localpassword123`.

**User migration:** the auth user id *is* the legacy `userUuid` value
(`users.id` property maps to the `user_uuid` column), so importing Cognito
users is an id mapping — no child-table rewrite.

## UI

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

## Seam

`server/data-client.ts` is the interface; `server/postgres-data.ts` and
`server/fake-data.ts` are two implementations. Routes never import SQL.
