# Backend status — what exists today

**Repo:** `github.com/fifictional/THE-curio-remake` (54 commits)
**Runtime:** local only — no AWS account, no deployment
**Stack:** Hono on Node · PostgreSQL 16 (Docker) · Drizzle · Better Auth · Qdrant (endpoints only) · OpenAI (optional)

---

## 1. Replaced the AWS stack with a local one

| Was | Now |
|---|---|
| Next.js API routes + Lambda | **Hono on plain Node** (`server/`), port 3101 |
| AppSync GraphQL | **REST endpoints** + a generic bridge endpoint |
| DynamoDB | **PostgreSQL**, Drizzle schema + SQL migrations |
| Cognito | **Better Auth** (email+password, session cookie) |
| S3 | **local disk** (`.local/files`) |
| DynamoDB Streams → SQS → ECS → Step Functions | **in-process polling worker** |
| Secrets Manager | `.env` |

`server/` is ~3,600 lines of TypeScript, no AWS SDK dependency.

## 2. Database

- **43 domain tables**, created by committed SQL migrations (`0000`–`0003`), plus
  `import_quarantine` and the four Better Auth tables
- 4 auth tables (`users`, `sessions`, `accounts`, `verifications`) + 23 domain tables
- Real foreign keys with explicit `ON DELETE` behaviour, `timestamptz`, `jsonb` for the old embedded types, Postgres enums for message role/type
- Migrations via `drizzle-kit generate` → reviewed SQL files (no "the platform generated it" black box)

**Migrated models (all 44):** app_settings, batch_processes, bundles, chat_citations, chats, curio_subscriptions, datalab_requests, document_sections, document_summaries, document_vision_outputs, documents, exam_modules, exam_paper_questions, exam_papers, extracted_questions, flashcard_decks, flashcard_games, flashcards, future_users, memory_blocks, memory_candidates, messages, metadata, mock_documents, mock_exam_logs, mock_exams, partnerships, purchases, question_extract_jobs, question_generation_jobs, questions, quiz_attempts, quiz_questions, quizzes, receipts, sat_mini_exam_logs, space_users, spaces, tasks, user_action_logs, user_learning_profile_history, user_requests, youtube_videos.

## 3. Security — the headline change

The old stack had **65 `allow.publicApiKey` rules vs 2 owner-scoped ones**: the browser held a public key and permission checks lived in application code.

Now:

- The browser **never touches the database**. Every read/write goes through the API.
- **Row-level security is enforced by Postgres**, not by route guards: 37 tables have `ENABLE + FORCE ROW LEVEL SECURITY` with owner policies (`messages` via its chat, `document_summaries`/`document_sections` via their document, `exam_paper_questions` via its paper). Three are read-only for everyone (partnerships, app_settings, mock_documents), `future_users` and `batch_processes` have no policy at all, and the shared `extracted_questions` bank is readable by all but writable only through the job that produced the row.
- **Roles are split:** `curio` (owner: migrations/seed) and `curio_app` (`LOGIN NOBYPASSRLS`, used by the app). This matters — a superuser **bypasses RLS even with FORCE**, which silently disabled the whole scheme at first.
- Every query runs inside `asUser(userId)` → a transaction that sets `app.user_id`, so the policies apply per request.
- Ownership is proven by test, not assertion: a second signed-in user gets `Chat not found` on `/messages`, `/aiChat`, `/moveChat`, and **0 rows** when querying Postgres directly.

## 4. API surface (port 3101)

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/*` | Better Auth: sign-up, sign-in, sign-out, get-session |
| `GET /me` | current user (401 when signed out) |
| `GET /messages?chat=` / `POST /messages` | chat history + append (owner-checked) |
| `POST /aiChat` | one user turn → model reply, both persisted |
| `POST /moveChat` | the ported production route (chat + flashcards + questions between spaces) |
| `POST /rag/reindex`, `GET /rag/search` | Qdrant: embed + filtered vector search |
| `POST /files`, `GET /files`, `DELETE /files` | local object storage |
| `POST /documents` | create Document + PENDING Task |
| `POST /db` | **the bridge** (see §6) |
| `POST /log` | dev-only browser error relay |

## 5. AI + vector search

- `server/ai.ts`: OpenAI chat + embeddings through `fetch`, no SDK. **Without `OPENAI_API_KEY` it returns a deterministic mock reply**, so the whole flow is demonstrable offline.
- `server/qdrant.ts`: collection bootstrap, upsert, search with a `userUuid` payload filter — same isolation model as the database. Two collections: `chat_messages` and `document_chunks`.
- **Retrieval is wired into chat**: the worker chunks + embeds each document (1200 chars, 200 overlap), `/aiChat` retrieves the caller's top chunks before answering and writes one `chat_citations` row per source document, and the UI's Sources tab renders them (`isWebSearchCalled`, which the UI gates on, is now set when a chat gains citations). `POST /rag/reindex {documentUuid}` / `{all:true}` backfills. Character offsets are 0: we cannot know which span a model used, and faking one would highlight the wrong text.
- **Offline behaviour**: `embed()` falls back to a deterministic pseudo-vector without a key, so index → filter → search is testable; *semantic* quality needs `OPENAI_API_KEY`, and retrieval stays off without one (`RAG_OFFLINE=1` forces it for wiring checks only).
- `npm run qdrant:smoke`: upserts 3 points, searches, asserts cross-user isolation, cleans up. Passes.

## 6. The bridge — how the old UI runs unmodified

The original frontend (678 files) was copied in as `ui/` and pointed at the new API instead of Amplify. Four seams only:

| Shim | Replaces |
|---|---|
| `ui/src/lib/local-data-client.ts` | `generateClient<Schema>()` → `POST /db` |
| `ui/src/lib/local-auth*.ts` | Cognito session + `useAuthenticator` |
| `ui/src/lib/local-storage.ts` | `@aws-amplify/storage` (`uploadData`, `getUrl`, `downloadData`, `remove`) |
| `ui/amplify_outputs.json` (stub) | generated Amplify config |

`POST /db` answers `{model, method, args}` from Postgres **inside `asUser()`**, so the bridge grants no extra reach. It serves 27 models (the ten that only backed dropped features were removed), filters unknown AppSync-only columns, coerces ISO datetimes, and caches reads for 2s (invalidated on writes). Models with no registry entry (including the two owner-only tables) return an empty result, which is what keeps unmigrated screens rendering.

## 7. Document pipeline (local)

```
upload → /files (disk) → /documents (Document + Task PENDING)
      → polling worker (5s): extract text → summary → document_summaries
      → task COMPLETED/FAILED
```

Verified end to end: upload → task `COMPLETED 100` → summary row → visible in the Library through the real UI. **PDFs are parsed** via their text layer (`server/pdf.ts`, pdf.js through `unpdf`: no key, no service, no native build). A 285 KB policy PDF migrated from S3 produced a summary containing its real text. Scans with no text layer still yield nothing — that, and Datalab's page/bbox layout, is the remaining gap.

## 8. Tests + CI

- **13 automated tests**: 5 unit (ported route over HTTP with a fake client) + 8 integration against real Postgres + real Better Auth (two users, owner access, cross-user denial, RLS at the DB layer, aiChat persistence).
- Integration suite self-skips when no database is reachable, so `npm test` stays green anywhere.
- GitHub Actions: Postgres + Qdrant service containers → migrate → RLS → typecheck → tests → Qdrant smoke; separate job builds the UI.
- Strict `tsc --noEmit` clean in both packages.

## 9. Docs

- `docs/adr/0001-data-layer.md` — Postgres vs Dynamo/Mongo/Supabase, with costs and "what would change my mind"
- `docs/adr/0002-data-model-and-migration.md` — inventory of the 44 Dynamo models + the migration plan (export → transform → load → verify)
- `docs/adr/0003-database-erd.md` — ER diagrams generated from the old schema
- `docs/adr/0004-strangler-ui.md` — why the original UI runs unchanged, and the exit criteria
- `docs/decisions.md` — the agreed choices (DB, auth, REST, polling, Qdrant, local files, scope) and the three features dropped on 2026-11-17

## 10. What is explicitly NOT done / out of scope

- **No deployment**, no AWS resources created, no CI secrets configured
- **No production data migration** — dev is migrated (13,673 rows, 299 objects); release is
  blocked on the decisions in `docs/migration-runbook.md` §5
- **OCR for scanned PDFs, and Datalab-style layout/bbox extraction**
- **Payments (Paddle)** and tier enforcement
- **Realtime push** — replaced by 4s polling on the open chat
- **Open-source prep** — `users.json` (30 MB of real user records) and `debug.txt` are still in the old repo's git history and must be purged before anything goes public

Out of scope by decision (2026-11-17), not by omission — see `docs/decisions.md`:

- **Practice / mock tests** — no generation pipeline; migrated `mock_exams` rows are not a supported surface
- **Learning profile** — the two `/learningProfile*` routes do not exist; no mastery model
- **SAT prep** — no `/satus*` product; the `satus` feature flag stays off
  (The dependent tables were still migrated, so the data is not lost; only the features are gone.
  Cleanup is done: routes deleted (they 404), nav/entry points removed, and the ten
  feature-only models dropped from the `/db` registry — see `docs/decisions.md`.)
