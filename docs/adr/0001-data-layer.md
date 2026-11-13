# ADR 0001 — Data layer

**Status:** Proposed (decision required)
**Date:** 2026-11-12
**Scope:** Which database and which data-access path the rewrite uses. Does not cover UI framework, desktop packaging, hosting, or the document pipeline internals.

---

## Decision

Use **PostgreSQL** as the system of record, accessed **only** through our own **Hono API on Node**. The browser never talks to the database.

- **No DynamoDB** in the new stack. Existing data is migrated once via an export → import script.
- **No MongoDB.**
- **No Supabase as a platform dependency.** We adopt its good idea (Row Level Security) but run plain Postgres, so the code also runs against local Docker, a managed instance, or an embedded variant for desktop.
- **Auth:** Better Auth for identity; **RLS policies** enforce per-row ownership.
- **Realtime:** SSE (`text/event-stream`), not WebSockets, not AppSync subscriptions.
- **API:** Hono on Node, reusing the existing `amplify/hono/**` routes, middleware, and 268 unit tests.

---

## Why

**1. The schema is relational and already pretends not to be.**
`amplify/data/resource.ts` (1,698 lines) declares 44 models, **45 `.identifier(...)` overrides** and **41 `secondaryIndexes`**:

- `Document → Chat → Message → ChatCitation` (four levels)
- `Space → Document`, `SpaceUsers.level` (owner / editor / viewer)
- `Quiz → QuizQuestion`, `ExamPaper → ExamPaperQuestion`, `MockExam → MockExamLog`
- `userUuid` on ~30 models — one owner across everything

Examples that are foreign keys and composite primary keys wearing a costume:

```ts
UserRequest:   .identifier(['userUuid', 'createdAt'])
Flashcard:     .identifier(['flashcardUuid', 'createdAt'])
Message:       .secondaryIndexes((i) => [i('chatUuid').sortKeys(['createdAt'])])
```

In Postgres these are `PRIMARY KEY (user_uuid, created_at)`, `FOREIGN KEY`, `CREATE INDEX`. One line each.

**2. Permissions are currently application-level, and that is the security problem.**
`amplify/data/resource.ts` contains **65 `allow.publicApiKey`** rules vs **2 `allow.ownerDefinedIn`**. The API key is embedded in the browser bundle (`src/providers/amplify-provider.tsx` → `generateClient({ authMode: 'apiKey' })`), so the client can call the API directly.

The consequence is documented in the code itself — `src/lib/ssr/utils/request-helper.ts:21`:

> *"The Document model now again allows apiKey CRUD, so we enforce ownership explicitly via `authorizeDocumentAccess()`"*

DynamoDB has no row-level security. Moving to a server-only API + Postgres RLS moves enforcement from "we remembered to check in 244 call sites" to "the database refuses". This is a structural fix rather than another patch.

**3. It removes the Next.js server attack surface.**
The Nov 11 security commit (`0dede99d`: image-optimization RCE `CVE-2026-96889` / `GHSA-2464-fhr4-w9xw`, SVG-rejection bypass `GHSA-7qx7-33qx-rqx2`, sharp/libvips bump) was in a Next.js server feature we do not need. With Hono + Node there is no `/_next/image` endpoint, no framework server to attack, and no secrets in the browser.

**4. Local development becomes possible at all.**
On a fresh clone today none of these exist: `node_modules`, `amplify_outputs.json`, `.amplify/`, `.env.local`. `src/providers/amplify-provider.tsx:5` imports `amplify_outputs.json` statically, so **the app cannot compile without deploying to AWS first**. Postgres runs with one command; a shared `docker-compose.yml` gives every engineer the same environment.

**5. It survives the known requirements.**
Open source + fork + desktop app + users bring their own AI key ⇒ no per-user AWS footprint, no platform lock-in, and a data layer that can be embedded later.

---

## Alternatives considered

| Option | Why not |
|---|---|
| **Keep DynamoDB** (local Docker) | Chosen originally *because* Amplify Gen 2 generated it. That reason disappears with Amplify. No RLS ⇒ ownership checks stay in application code, i.e. the existing bug class is retained. 44 tables + 41 GSIs must be hand-authored anyway, so the "it's already set up" saving is mostly illusory once we leave Amplify. |
| **MongoDB** | Fits the document shape but has no row-level security; ownership becomes `filter: { userUuid }` and a single forgotten filter leaks data. Also does not answer "we already have Dynamo data" any better than Postgres does. |
| **Supabase (full platform)** | Postgres + Auth + Storage + Realtime in one product is genuinely attractive, and `supabase start` is a good local story. But adopting another all-in-one platform reproduces the Amplify coupling we are trying to escape. **Compromise:** use Supabase locally as a convenience if the team prefers, but keep the application dependent only on plain Postgres. |

---

## What this costs

| Work | Notes |
|---|---|
| 44 tables → Postgres schema | Mechanical. 45 identifier overrides → primary keys, 41 secondary indexes → indexes. |
| One-off data migration | Export DynamoDB → JSON → import, with row-count verification per table. **The data is kept; only the engine changes.** |
| Bridge for **638** data call sites | 394 in `src/` (342 `.models.*`, 13 `.queries.*`, 39 `.mutations.*`) + 244 in `amplify/`. Plan: keep the `client.models.*` shape, reimplement as an HTTP client against the Hono API. |
| Realtime replacement for **64** subscriptions | 25 `onCreate`, 27 `onUpdate`, 12 `onDelete` in `src/`. Deferred: milestone 1 renders once and does not need live push. |
| Document pipeline unaffected by DB choice | `Task` INSERT → `processTaskStream` → SQS → dispatcher → Step Functions is a **separate** rewrite (polling worker). Datalab remains an external paid API (`datalab-api-key`); Bedrock embeddings cannot run locally and need an alternative provider. |
| Not free: learning time | Postgres schema + migrations is new ground for the team. Front-loaded but bounded. |

---

## Out of scope for this ADR

Desktop packaging (Tauri vs Electron), UI framework choice, hosting topology (EC2 vs managed), AI provider selection, and the document-pipeline design. Those are separate ADRs and separate decisions.

---

## What would change my mind

- **Ship-in-4-weeks constraint on live data.** If the deadline dominates, keeping DynamoDB + a server-only API (no `publicApiKey`, explicit ownership checks everywhere) is the cheaper path, at the cost of carrying the current permission model forward.
- **A requirement that the database is not relational after all** (e.g. per-user free-form memory as the primary store). Unlikely given the model list, but it would weaken the main argument.
- **Team capacity for Postgres.** If nobody can own schema/migration work, the migration becomes a schedule risk and a narrower plan is justified.

---

## Consequences

1. The browser loses all direct database access; every read/write goes through the Hono API.
2. Permissions become a policy problem (RLS), not a discipline problem.
3. Local development no longer requires AWS credentials.
4. The 638 call sites remain the critical path; the bridge design is the next decision after this one.

**Next:** ADR 0002 — data-access bridge (keep `client.models.*` shape as an HTTP client vs. rewrite call sites).
