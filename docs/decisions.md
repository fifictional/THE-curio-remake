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

Cleanup that follows from this (not done yet): delete the `/satus*` and `/mock-exams*`
screens from `ui/`, remove their entries from the `/db` bridge registry, and drop the
nav/flag plumbing. Until then the screens still exist but lead to empty or redirecting
states.
