# Deploy plan — managed Postgres + container host

Decision: **option A** (managed Postgres + a container host). Chosen 2026-11-18; see
[`open-decisions.md`](open-decisions.md). The plan below defaults to **Render**
because it bundles Postgres, a persistent disk and TLS, but nothing here is
Render-specific — Fly + Neon, Railway, or any container host works with the same
three services and the same environment variables.

Everything in this document is testable locally: the production web server
(`web/server.mjs`) and the API `/health` endpoint exist in the repo and were
verified against a real build.

---

## 1. Topology

```
                    ┌──────────────────────────────┐
   browser ────────►│ curio-web (public, HTTPS)    │
                    │ node server.mjs :3000        │
                    │  · SSR from dist/server      │
                    │  · static from dist/client    │
                    │  · proxies /api,/db,/files…  │  first-party cookie, no CORS
                    └──────────────┬───────────────┘
                                   │ private network
                    ┌──────────────▼───────────────┐      ┌──────────────────┐
                    │ curio-api (private)          │─────►│ managed Postgres │
                    │ npm start :3101              │      │ + PITR backups   │
                    │  · request path (curio_app)  │      └──────────────────┘
                    │  · polling worker            │
                    │    (curio_service)           │
                    │  · disk: .local/files        │
                    └──────────────────────────────┘
```

Three processes, two credentials on purpose (see runbook §3c):

| Service | Command | Role used |
|---|---|---|
| `curio-web` | `npm --prefix web run build && node server.mjs` | none (proxies only) |
| `curio-api` | `npm start` (SET `WORKER_ENABLED=1`) | `curio_app` for requests, `curio_service` for the worker |
| migrations | `npm run db:migrate && npm run db:rls` | `curio_owner`, run once per deploy |

The worker runs **inside the API process** for now: it needs the same disk, and one
instance keeps `curio_service`'s bypass honest. Split it into its own service when
there is a reason to (throughput, or a second API instance).

**Qdrant is not deployed.** Without `QDRANT_URL` retrieval uses Postgres full text,
which is what runs in dev today. Add Qdrant Cloud later if paraphrase matching
proves worth it; the code switches on the env var alone.

---

## 2. Environment

### curio-web

| Variable | Value |
|---|---|
| `PORT` | `3000` (the host usually injects this) |
| `API_ORIGIN` | `http://curio-api:3101` (private address) |
| `VITE_API_ORIGIN` | build-time only, used by SSR fetches that bypass the proxy; set to the public web origin or leave unset and rely on `API_ORIGIN` |

### curio-api

| Variable | Value |
|---|---|
| `PORT` | `3101` |
| `DATABASE_URL` | `postgres://curio_app:…@host/db` — requests, subject to RLS |
| `DATABASE_URL_SERVICE` | `postgres://curio_service:…` — worker + indexer, `BYPASSRLS` |
| `DATABASE_URL_OWNER` | used **only** by the migration step, not by the running service |
| `BETTER_AUTH_SECRET` | 32+ random bytes, unique per environment |
| `BETTER_AUTH_URL` | `https://curio.example.com` — must be the public HTTPS origin, or the session cookie is not `Secure` |
| `BETTER_AUTH_TRUSTED_ORIGINS` | same public origin (comma-separated). **Without it sign-in answers 403** — verified locally: a proxied sign-in from an untrusted origin is rejected |
| `FILES_DIR` | `/data/files` (the mounted disk) |
| `OPENAI_API_KEY` | optional. Without it answers are mock replies; retrieval, indexing and citations still work |
| `GIT_COMMIT` | commit SHA, surfaced by `/health` |
| `WORKER_ENABLED` | `1` (set `0` if you later split the worker out) |

### Data

| | |
|---|---|
| Postgres | managed, 16+, with point-in-time recovery. Postgres 15+ is required for the `public` schema privilege model we rely on |
| Disk | 10–20 GB mounted at `/data` for `.local/files`; snapshot it |
| TLS | terminated by the host |

---

## 3. First deploy, in order

```bash
# 0. one-off, with the provider's admin credential
#    (runbook §3c has the exact role SQL: owner / service / app)
psql $ADMIN_URL -f <roles from runbook §3c>

# 1. schema + policies, as the owner
DATABASE_URL_OWNER=$OWNER_URL npm run db:migrate
DATABASE_URL_OWNER=$OWNER_URL npm run db:rls

# 2. data (runbook §1–§3), then the derived chat flags (runbook §3b)

# 3. deploy curio-api, then curio-web
#    health check for curio-api: GET /health  (503 when the DB is unreachable)

# 4. prove it before real traffic
API_URL=https://curio.example.com npm run verify:api      # from a machine with network access
```

`npm run verify:api` creates its own users, data and files and deletes them again,
so it is safe to run against staging (not production).

---

## 4. What still needs work before this is a finished deployment

| Gap | Effect | Fix |
|---|---|---|
| **Files live on local disk** | one API instance only; a second instance cannot see the same files | mount a disk (this plan) or move `server/routes/files.ts` + `extractText` to an S3-compatible bucket — the only real code change for horizontal scaling |
| No CI deploy job | `main` does not reach the server | add a deploy step to `.github/workflows/ci.yml` once the host is picked |
| No monitoring | failures are silent | host alerts on `/health`, plus error tracking (Sentry was in the legacy app) |
| Backups untested | PITR exists but no restore drill | do one restore into a scratch database this month |
| Secrets in env | acceptable for v1 | host secret store; rotate `BETTER_AUTH_SECRET` never (it invalidates sessions) |

---

## 5. Rollback

- **Code**: the host keeps the previous deploy; roll back by redeploying it.
- **Data**: the old AWS stack stays read-only for two weeks (runbook §5). Nothing in
  this deployment writes to it, so the rollback window is real.
- **Sessions**: rotating `BETTER_AUTH_SECRET` logs everyone out. Do not rotate it to
  "fix" something.

---

## 6. Cost sketch (Render, smallest useful)

| Item | ~monthly |
|---|---|
| web service (starter) | $7 |
| api service + 10 GB disk | $7 + $2.50 |
| Postgres (basic, PITR) | $6–20 |
| **total** | **~$23–37** |

Scale by instance size, not by adding services: the API is the only thing under load.

---

## 7. Cutover checklist

- [ ] roles created, migrations + `db:rls` applied (as owner)
- [ ] data imported, `docs/migration/orphans.json` reviewed
- [ ] chat flags derived (runbook §3b)
- [ ] `BETTER_AUTH_URL` + trusted origins set to the public HTTPS origin
- [ ] `/health` green from outside
- [ ] `verify:api` green against staging
- [ ] reset-link campaign ready (runbook §2e) — **every imported user must set a password**
- [ ] old stack read-only, two-week clock started
