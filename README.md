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

The page at `/` lists real rows and lets you move the chat between spaces.

Seeded ids: chat `44444444-4444-4444-8444-444444444444`, spaces `2222…` (Biology) and `3333…` (Chemistry).

## Seam

`server/data-client.ts` is the interface; `server/postgres-data.ts` and
`server/fake-data.ts` are two implementations. Routes never import SQL.
