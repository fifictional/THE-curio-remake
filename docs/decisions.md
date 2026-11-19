# Decisions (2026-11-13, updated 2026-11-17)

| Area | Decision | Notes |
|---|---|---|
| Database | **Postgres** | Docker locally, managed in production. Not DynamoDB, not Mongo, not the Supabase platform. |
| Data access | **Postgres behind `server/data-client.ts`** | Routes never touch SQL directly. |
| Auth | **Better Auth** | Migrate existing Cognito users (sub → new user id). |
| Wire format | **REST** | Framework-free so a desktop client / fork can call it. |
| Realtime | **Polling** | No SSE/WebSocket in v0. |
| RAG | **Qdrant** | Local Docker. Embeddings via OpenAI. |
| File storage | **Local disk** | `.local/files/`. S3 later if hosting. |
| v0 scope | **Chat + documents/library** | Upload, local pipeline, summaries. No Datalab layout AI. |
| AI keys | **User-provided, local** | `OPENAI_API_KEY` required (chat + embeddings); Anthropic/Gemini optional. |
| Roles | **owner / service / app** | `db:rls` creates `curio_app` (NOBYPASSRLS, requests) and `curio_service` (BYPASSRLS, worker + indexer). The owner runs migrations only and is never mounted into the runtime. |
| Imported users' passwords | **Forced reset** (2026-11-18) | Cognito hashes cannot be verified by Better Auth, so they are not carried over. Users set a new password from the sign-in screen; everything else (documents, chats, cards, quizzes) is already migrated. No password is ever known to us, so this is also the honest option. 4 users have a placeholder `@import.invalid` email and cannot self-serve — they need support. |
| Billing | **Keep Paddle** | Merchant of record, so tax/invoices/refunds stay theirs; existing subscribers are already there. The webhook is the source of truth and works with only a signing secret. |
| Admin | **Ops CLI, no admin UI** | `npm run ops` (stats, users, chats, tasks, quarantine, memory). No role model, no PII in a browser. |
| OCR | **Datalab** | Only for scans (no text layer); text-layer PDFs stay local. Without a key, scans are reported as unreadable rather than faked. |
| Hosting | **Not decided** | Local first. |
| Desktop | **Later** | Design for it by keeping SQL portable. |

## Required keys

| Key | Why |
|---|---|
| `OPENAI_API_KEY` | chat + embeddings (required) |
| `ANTHROPIC_API_KEY` | optional provider fallback |
| `GEMINI_API_KEY` | optional provider fallback |

## Dropped from this implementation (2026-11-17)

Product decision. The data model still carries these (migrated faithfully, exported rows
imported, tables kept) — they are simply not part of the product we are shipping, and no
new work goes into them.

| Feature | What that means |
|---|---|
| **Practice / mock tests** | No generation endpoint (document → AI questions), no new practice tests. Existing `mock_exams` / `mock_exam_logs` rows stay in Postgres for data fidelity; the viewer is not a supported surface. |
| **Learning profile** | No mastery model. `/learningProfileQuery` and `/learningProfileMutation` are not implemented. `user_learning_profile_history` keeps migrated rows only. |
| **SAT prep** | No `/satus*` product. `sat_mini_exam_logs`, `extracted_questions`, `exam_papers`, `exam_paper_questions` are migrated data, not features. The `satus` feature flag stays off. |

Why these three: Neptune was removed in July 2026 (`f0211344`) for VPC/infrastructure
reasons, which stubbed the learning-profile and knowledge-base routes and left the SAT
dashboard unable to load. Rather than rebuild an unowned mastery model, the rewrite drops
the dependent surfaces. Practice tests are dropped for scope, not infrastructure.

### Cleanup, done 2026-11-17

- **Routes deleted** (`ui/src/app`): `satus/`, `satus-onboarding/`, `mock-exams/`,
  `sat-us-exam-bundle/`, `admin/mock-exam/`. They now 404, and the smoke run asserts it.
- **Components/hooks deleted**: the SAT dashboard and onboarding, the mock-exam flow and
  viewer, the learning-profile hooks, the practice-test question bank (`lib/data/sat-*`),
  and the exam tabs in the chat panel (7 tabs, removed from `core-actions-tabs.tsx`).
- **Entry points removed**: sidebar "Practice Tests" and "SAT" links, the home-page
  "Try our Practice Tests" CTA, the free-SAT-exam path in pricing/onboarding/chat tool
  cards, `mock-exams`/`satus` from flash-sale targeting, and the `satus-onboarding` guest
  routes.
- **Bridge registry**: `MockExam`, `MockExamLog`, `ExamPaper`, `ExamPaperQuestion`,
  `ExtractedQuestion`, `QuestionExtractJob`, `QuestionGenerationJob`, `SATMiniExamLog`,
  `FlashcardGame`, `UserLearningProfileHistory` no longer have a `/db` entry (27 models
  left, from 37). The tables stay; the API stops serving them.
- **Kept on purpose**: `/exam-bundles` is still the pricing page (the top-bar upgrade CTA
  points at it) — only its "go to practice tests" copy is gone. `MockDocument` stays: it
  is the seeded sample library, not a practice test. The admin screens for question
  extraction/generation remain but are unreachable (the auth shim reports no `admin`
  group) and their models are no longer served.
