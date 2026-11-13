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
