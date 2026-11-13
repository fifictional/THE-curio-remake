# Decisions (2026-11-13)

| Area | Decision | Notes |
|---|---|---|
| Database | **Postgres** | Docker locally, managed in production. Not DynamoDB, not Mongo, not the Supabase platform. |
| Data access | **Postgres behind `server/data-client.ts`** | Routes never touch SQL directly. |
| Auth | **Better Auth** | Migrate existing Cognito users (sub → new user id). |
| Wire format | **REST** | Framework-free so a desktop client / fork can call it. |
| Realtime | **Polling** | No SSE/WebSocket in v0. |
| RAG | **Qdrant** | Local Docker. Embeddings via OpenAI. |
| File storage | **Local disk** | `.local/files/`. S3 later if hosting. |
| v0 scope | **Chat only** | No document upload, no Datalab. |
| AI keys | **User-provided, local** | `OPENAI_API_KEY` required (chat + embeddings); Anthropic/Gemini optional. |
| Hosting | **Not decided** | Local first. |
| Desktop | **Later** | Design for it by keeping SQL portable. |

## Required keys

| Key | Why |
|---|---|
| `OPENAI_API_KEY` | chat + embeddings (required) |
| `ANTHROPIC_API_KEY` | optional provider fallback |
| `GEMINI_API_KEY` | optional provider fallback |
