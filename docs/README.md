# Docs index

Start here. Everything else is detail.

## The three that matter

| Read this | When |
|---|---|
| [`decisions.md`](decisions.md) | you want to know *why* something is the way it is, and what was deliberately dropped |
| [`backend-status.md`](backend-status.md) | you want the current state: what works, what is explicitly not done |
| [`migration-runbook.md`](migration-runbook.md) | you are moving real DynamoDB/S3 data, or provisioning production roles |

## Reference

| Doc | Contents |
|---|---|
| [`adr/0001-data-layer.md`](adr/0001-data-layer.md) | Postgres vs DynamoDB/Mongo/Supabase, with costs |
| [`adr/0002-data-model-and-migration.md`](adr/0002-data-model-and-migration.md) | the 44 legacy models and the migration plan |
| [`adr/0003-database-erd.md`](adr/0003-database-erd.md) | ER diagrams from the legacy schema (`erd.html`) |
| [`adr/0004-strangler-ui.md`](adr/0004-strangler-ui.md) | why the original UI ran unchanged, and the parity exit criteria |
| [`migration-findings.md`](migration-findings.md) | what the real rows taught us: corrupted payloads, composite keys, NUL bytes, orphan keys |
| `migration/` | committed findings + samples; raw exports and stack templates are gitignored |

## Where things run

| Piece | Port | Command |
|---|---|---|
| API (Hono) | 3101 | `npm start` (or `npm run dev` for watch) |
| New UI (`web/`, TanStack Start) | 5173 | `npm --prefix web run dev` |
| Legacy UI (`ui/`, Next) | 3300 | `npm run ui:build && npm run ui:start` |
| Postgres 16 | 5433 | `npm run db:up` |
| Qdrant | 6433 | same |

`npm run dev:all` starts the first two (add `-- --with-ui` for the third).

## Verifying

```bash
npm test              # 52 unit + integration (integration self-skips without a DB)
npm run lint          # oxlint: server, scripts, web
npm run type-check    # API
npm --prefix web test # web loaders
npm run verify:api    # 46 HTTP checks, self-cleaning
npm run verify:web    # browser checks for the new UI
npm run smoke         # legacy screens + new UI (Playwright)
npm run qdrant:smoke  # vector round-trip and isolation
```

## Out of scope by decision (2026-11-17)

Practice/mock tests, the learning profile and SAT prep. The tables were migrated
for fidelity; the features are not built and their screens are deleted. Details in
[`decisions.md`](decisions.md).

## Not built yet

Deployment, payments, admin roles, flashcard/quiz generation, OCR for scanned PDFs,
production data migration (blocked on account access and the password strategy for
imported users). See `backend-status.md` §10.
