# Handoff — next agent

Read this first, then `docs/parity.md` (what the old app does vs what this one does),
then `docs/decisions.md` (why). Everything below was verified against a running
stack, not assumed.

**State at handoff:** 94 commits, tree clean, `main == origin/main`.
61 API tests + 16 web tests passing, 46-check HTTP sweep and a Playwright sweep
green, database at the migrated baseline (numbers in §2).

---

## 1. What this repo is

An open-source rewrite of **Curio** (an AI study app) off AWS Amplify Gen 2.
The replaced stack: AppSync, DynamoDB (44 models), Cognito, S3, Lambda, SQS, ECS,
Step Functions.

The replacement: **Hono on plain Node** (`server/`), **Postgres 16 + Drizzle**,
**Better Auth**, **Qdrant** (optional), local disk for objects, an in-process
polling worker instead of the event fan-out.

Two frontends coexist on purpose (ADR 0004, "strangler"):

- `ui/` — the **original** Next.js app, copied unchanged, running against the new
  API through four shims. Pixel parity by construction.
- `web/` — the **replacement** (TanStack Start, SSR). It now covers the product:
  shell, chat, library, document, spaces, profile, settings, metadata, onboarding,
  password reset.

## 2. Run it

```bash
cp .env.example .env          # OPENAI_API_KEY is optional (see §5)
npm run db:up                 # postgres:5433 + qdrant:6433
npm run db:migrate            # schema
npm run db:rls                # roles + policies
npm run dev:all               # API :3101 + new UI :5173
```

| Piece | Port | Notes |
|---|---|---|
| API (Hono) | 3101 | `npm start` / `npm run dev` (watch) |
| New UI | 5173 | `npm run web`; production: `web/server.mjs` on `PORT` (default 3000) |
| Legacy UI | 3300 | `npm run ui:build && npm run ui:start` |
| Postgres / Qdrant | 5433 / 6433 | docker compose |

**Logins:** `test@curio.to` / `localpass123` (migrated user, adopted locally) or
`local@curio.test` / `localpassword123` after `npm run db:seed`.

**Database roles:** `curio` (owner, superuser locally — migrations, seed),
`curio_app` (requests, NOBYPASSRLS), `curio_service` (worker/indexer, BYPASSRLS).
Run the API with `DATABASE_URL_SERVICE=postgres://curio_service:curio_service@localhost:5433/curio`
to exercise the production role model.

## 3. Verify (do this before and after any change)

```bash
npm run type-check          # clean
npm test                    # 61 tests (integration self-skips without a DB)
npm --prefix web test       # 16 tests
npm run lint                # oxlint: server, scripts, web
npm run verify:api          # 46 HTTP checks, self-cleaning
npm run verify:web          # Playwright: new UI (needs :5173)
npm run smoke               # Playwright: legacy screens + new UI
npm run qdrant:smoke        # vector round-trip + isolation
```

Expected baseline after a clean run: **13,673 migrated rows**, 107 users, 210
documents, 186 chats, 1,384 messages, 65 citations, 81 chunks, 66 memory blocks,
896 tasks, 13 spaces, 1,387 files in `.local/files`.

## 4. Map

```
server/
  app.ts                  routes, auth middleware, /health, rate limits
  auth.ts                 Better Auth (+ reset mailer seam)
  data-client.ts          the seam routes use (no SQL outside implementations)
  postgres-data.ts        Drizzle implementation of that seam
  routes/                 db bridge, messages, ai-chat, documents, files, rag,
                          spaces (membership), account, memory, billing, generate
  db/schema.ts            43 domain tables
  db/rls.ts               roles + policies (idempotent, run after migrations)
  db/scope.ts             asUser() — request transaction with app.user_id
  pdf.ts / ocr.ts / document-index.ts   text layer, Datalab, chunks + FTS
  billing.ts              Paddle signature + event mapping
scripts/
  export-dynamo.mjs import-postgres.mjs make-fixture.mjs repair-memory-payloads.mjs
  aws-inventory.sh aws-samples.sh adopt-user.mjs copy-objects.mjs
  ops.mjs (npm run ops)   the admin surface
  dev.mjs (npm run dev:all)
  lib/repair-payload.mjs
web/src/
  server/loaders.ts       all page data (plain functions, unit tested)
  server/api.ts           thin createServerFn wrappers
  server/fetch.server.ts  forwards the session cookie to the API
  routes/                 index, library, documents/$id, spaces/$id, profile,
                          settings, metadata/$id, welcome, forgot, reset
ui/                       legacy app (do not port more of it; see parity)
docs/                     start at docs/README.md
```

## 5. What is done

- **Data model + migration**: all 44 Dynamo models have tables; dev migrated
  (13,673 rows); 299/356 referenced S3 objects copied (204 MB); orphans preserved
  and reported; quarantined rows reported with reasons.
- **Security**: RLS `ENABLE + FORCE` on 44 tables, 29 policies, 15 owner-only
  (PII/job state/dropped features). RLS audit test fails if a table is added
  without a classification. Three roles, split for managed Postgres. Rate limiting
  on credentials/AI/uploads/search. Auth checked before body validation.
- **Auth**: Better Auth email+password, cookie sessions, ids preserved from
  Cognito `sub`; password reset with a mailer seam; forced-reset UX for imported
  users; account export + hard delete.
- **Chat**: markdown + KaTeX, 4s polling, `?chat=` deep links, citations panel,
  tool cards (flashcards/quiz, including the 35 migrated tool messages),
  composer shortcuts, attachments, copy message, rename/delete/move-to-folder.
- **Documents**: upload → worker → text (PDF text layer, Datalab for scans) →
  summary → chunks indexed; tabs (summary/document/chat/flashcards/quiz), in-app
  PDF viewer, per-document chat, delete.
- **Retrieval**: vector search with a key; Postgres full-text without one (with an
  OR fallback for question-shaped queries); citations persisted per document.
- **Generation**: flashcards + quizzes from a document or chat through an injected
  model seam; 503 with a clear message without a key.
- **Memory**: read-only blocks, toggle, export, clear. Reflection (writing) needs
  a key.
- **Billing (Paddle)**: signed webhook writes subscriptions/purchases/receipts
  (idempotent), status endpoint, checkout endpoint (needs credentials).
- **Ops**: `npm run ops` — stats, users, chat, tasks, quarantine, memory.
- **Delivery**: production server for `web/`, `/health`, deploy plan, `dev:all`,
  verification sweeps in the repo, CI (migrate, RLS, lint, typecheck, tests,
  Qdrant smoke, web build, API sweep).

## 6. What is open

### 6.1 Needs credentials (code is ready)

| Key | Where | What it unlocks | How to verify |
|---|---|---|---|
| `OPENAI_API_KEY` | `.env` | real answers, generation, semantic retrieval, memory reflection, web-search citations | `/aiChat` returns a real reply; document tabs generate cards |
| `PADDLE_API_KEY` (+ sandbox price ids) | `.env` | checkout (webhook already works) | `POST /api/billing/checkout` returns a checkout URL |
| `DATALAB_API_KEY` | `.env` | OCR for scanned PDFs | upload a scan → task completes with text |
| `PADDLE_WEBHOOK_SECRET` | `.env` | webhook verification (works locally with any secret) | see `server/billing.test.ts` |

**Not built even with a key:** web-search citations need a *provider* choice
(OpenAI web search vs a search API) — `Sources` already renders `url_citation`
rows, nothing produces them.

### 6.2 Needs a decision from the team

1. **Hosting** — `docs/deploy.md` has the plan (managed Postgres + container host,
   Render by default). Missing: the vendor choice, CI deploy job, monitoring,
   tested restore. **Known code gap:** files live on local disk, so more than one
   API instance needs an S3-compatible backend (`server/routes/files.ts` +
   `extractText` are the only places that touch disk).
2. **Production migration** — `docs/migration-runbook.md`. Blocked on: read-only AWS
   credentials, a staging database, a write freeze, and written calls to exclude
   `DocumentVisionOutput` and window `UserRequest`. Then: delta sync, reset-link
   campaign (§2e), derived chat flags (§3b), payload repair (§2f).
3. **Open-source prep** — `users.json` (30 MB of real user records) and `debug.txt`
   are in the **old** repo's git history. Purging history is irreversible; do not
   do it without explicit approval from the owner.
4. **Pricing/gifting/partner pages in `web/`** — `ui/` still serves them. Porting
   them is a product decision (what the subscription buys) more than a code task.

### 6.3 Small, unblocked, optional

- Message votes (copy is done).
- Analytics events (Mixpanel was in the legacy app; nothing is wired).
- `create_mock_exam` tool cards — belongs to a dropped feature; currently skipped.
- OCR quality tuning / page-level fallbacks.

## 7. Traps that cost time here (read before editing)

1. **Vite proxies by prefix.** `/me` swallowed `/metadata/...` and `/spaces`
   swallowed the app route. Use exact-match regex for `/me`
   (`web/vite.config.ts`) and put new API paths under `/api/`.
2. **Server functions cannot serialise `unknown`.** `Record<string, unknown>` in a
   loader breaks the build — ship JSON as text (see `ServerMessage.toolArgumentsJson`)
   or use concrete types.
3. **`createServerFn` needs a request context**, so it cannot be unit tested.
   Logic lives in `web/src/server/loaders.ts`; `api.ts` only wraps it.
4. **A new route with a type error never regenerates `routeTree.gen.ts`** (build
   runs `tsc` first). Regenerate with `npx vite build`, then fix types.
5. **RLS**: `FORCE` applies to the owner too. Locally the owner is a superuser so
   everything works; on managed Postgres the worker needs `curio_service`
   (BYPASSRLS) or its writes are rejected.
6. **RLS recursion**: a `space_users` policy must not reference `spaces` (and vice
   versa it may, because `space_users` is self-scoped).
7. **Bridge read cache** (2s, per user). A write that changes someone else's
   visibility must call `cacheInvalidateModel` — inviting a member does, and
   `SpaceUsers` clears Space/Document/Chat too.
8. **Bridge errors need a savepoint.** A failed statement aborts the request
   transaction, so a caught error still turns into a Hono 500 unless the query runs
   in a nested transaction (it does now).
9. **Bridge `create` defaults ownership** (`userUuid`/`ownerUuid`/`userId`) to the
   caller; creating a `Space` also writes the owner membership row.
10. **Postgres text rejects NUL bytes.** Real PDFs contain them (glyph maps); they
    are stripped in `pdf.ts` and `chunkText`.
11. **Amplify character-map payloads** can be string-encoded, split twice, and mixed
    with real keys. Repair loops until stable (`scripts/lib/repair-payload.mjs`) and
    merges named keys. Repair existing rows: `node scripts/repair-memory-payloads.mjs`.
12. **`quiz_questions` needed an `answer` column** — the old model kept the correct
    option only in the chat tool payload, so persisted quizzes were ungradable.
13. **Playwright `innerText` reflects `text-transform: uppercase`.** Assertions like
    `/Study material/` fail where the CSS uppercases headings — use case-insensitive
    regexes.
14. **The Playwright browser is pinned** by revision in `ui/playwright.smoke.config.ts`
    (this machine's cache); falls back to Playwright's own resolution when absent.
15. **Writing a field is not enough** — check the read path too. `listByChat` dropped
    `toolName`/`toolArguments`, so tool cards were invisible despite existing data.
16. **Rate limits can trip your own scripts.** Set `RATE_LIMIT_DISABLED=1` when a
    test needs many auth calls; production keeps them on.
17. **Proxied sign-in needs a trusted origin.** Better Auth answers 403 without
    `BETTER_AUTH_TRUSTED_ORIGINS` matching the web origin (only visible in prod).
18. **Do not `rm -rf .local/files/student-documents/*`** to clean test data — it
    deletes every migrated object. Restore with
    `npm run migrate:objects -- --bucket <dev-bucket>` (35s, verifies 299/299).

## 8. Working agreement used so far

- **No stand-ins for missing credentials.** Missing key → 503 with a clear message,
  never invented content. Two seams exist for testing the surrounding code:
  `createApp({ aiChat, generate })` and the mocked `apiFetch` in web tests.
- **Verify against a real stack.** Every claim in a commit message was a command
  actually run; browser checks use the running UI, not just types.
- **Leave the database at baseline.** Test data is created and deleted in the same
  run; `verify:api` and `verify:web` clean up their own accounts.
- **One commit per change**, message saying what broke, what was verified, and what
  was deliberately not touched.
- **`docs/parity.md` is the source of truth** for feature status. Move a row when a
  feature moves, and add the blocking reason when it is blocked.
- **Do not delete `ui/`** until the owner decides the remaining pages (pricing/
  gifting/partner) are ported or dropped.
