# 0002 — What the data is, how to store it, and how to migrate

**Status:** Working notes (feeds ADR 0001)
**Date:** 2026-11-12
**Scope:** A read of `amplify/data/resource.ts` and a concrete plan for a Postgres target. Not a decision doc — the decision is 0001.

---

## 1. How to choose a database for *this* data

Seven questions, answered from the schema itself:

| Question | Answer here | Points to |
|---|---|---|
| Do things relate to other things? | Yes — `Document → Chat → Message → ChatCitation`, 4 levels | relational |
| Does every row have an owner? | Yes — `userUuid` on ~30 models | row-level security matters |
| Do you need to query by many different fields? | Yes — 342 UI call sites filtering by user, space, document, chat, dates | indexes + SQL |
| Do you need referential integrity? | Yes, badly — nothing prevents a `Message` pointing at a deleted `Chat` today | foreign keys |
| What scale? | One product, thousands of users, not millions of writes/sec | Postgres handles it |
| Must it run locally with no cloud? | Yes | Postgres-in-Docker / SQLite |
| Might it ship inside a desktop app? | Maybe, later | keep SQL portable |

**Conclusion:** Postgres. Dynamo's advantage is enormous write throughput, which this product does not need. Mongo's advantage is schemaless documents, which this schema is not.

---

## 2. What the data actually looks like

44 models. **All 44 declare an explicit primary key** via `.identifier([...])` — there is no default-`id` model.

**Single-column primary keys (38):** `UserProfile.userUuid`, `Space.spaceUuid`, `Document.documentUuid`, `Chat.chatUuid`, `Message.messageUuid`, `Task.taskUuid`, `Quiz.quizUuid`, `MemoryBlock.memoryBlockUuid`, `BatchProcess.processId`, …

**Composite primary keys (6)** — these are the ones that need care:

| Model | Primary key |
|---|---|
| `UserRequest` | `(userUuid, createdAt)` |
| `Flashcard` | `(flashcardUuid, createdAt)` |
| `Question` | `(questionUuid, createdAt)` |
| `Purchase` | `(userId, bundleUuid)` |
| `MockExamLog` | `mockExamLogUuid` + GSI on `mockExamUuid` |
| `SATMiniExamLog` | `satMiniExamLogUuid` + GSI on `userUuid` |

**Three shapes of "column" exist, and they are not the same thing:**

1. **Real columns** — scalars (`a.string()`, `a.integer()`, `a.datetime()`, `a.enum([...])`).
2. **Embedded objects** — `a.ref('X')` / `a.customType`. **~35 of these.** Stored inline as JSON inside the parent row. Never queried independently.
3. **Relationships** — `a.hasMany(...)` (stores nothing; the child holds the key) and `a.belongsTo(...)` (stores the key, e.g. `chat.belongsTo('Space', ['spaceUuid'])`).

**Denormalized ownership columns.** Because there are no joins, the child tables repeat the parent keys: `Flashcard` carries `userUuid` + `spaceUuid` + `documentUuid` + `chatUuid`; same for `Question`, `Quiz`, `Chat`, `Document`. ~25 tables repeat `userUuid` this way.

That repetition is a **feature** for the migration: it means most tables can enforce ownership on their own, without a join.

**41 secondary indexes** (`index('chatUuid').sortKeys(['createdAt'])` and friends). In Dynamo these are GSIs. In Postgres they are ordinary indexes on `(partition, sort)`.

---

## 3. How to store it optimally in Postgres

Rules, in priority order:

1. **Keep the UUIDs as text or `uuid`.** `uuid` is correct; cast during import. If old data has non-UUID strings, use `text` and add a check.
2. **Timestamps → `timestamptz`.** They are ISO strings in Dynamo. Parse once at import.
3. **Embedded objects → `jsonb`.** All ~35 customTypes. Do **not** explode them into tables; they are read as a unit.
4. **Enums → Postgres `enum` type or `text` + `CHECK`.** There are ~40 inline enums (`role`, `status`, `type`, `difficulty`, `provider`, `tier`, `scope`, `decision`…). Note: Dynamo never enforced them, so the data may contain values outside the list — scan before you constrain.
5. **Foreign keys — this is the real gain.**
   - Content children → `ON DELETE CASCADE` (`messages.chat_uuid`, `quiz_questions.quiz_uuid`, `chats.document_uuid`? no — `SET NULL`).
   - Optional scope links → `ON DELETE SET NULL` (`chats.space_uuid`, `flashcards.space_uuid`).
   - Expect this step to **fail on existing orphans**. That is a finding, not a blocker.
6. **`NOT NULL`** wherever Amplify says `.required()`.
7. **Index the four list queries you actually make**, don't copy all 41 blindly:
   - `messages (chat_uuid, created_at)`
   - `chats (user_uuid, updated_at desc)`
   - `documents (user_uuid, created_at desc)`, `documents (space_uuid)`
   - `flashcards (user_uuid, created_at)`, `questions (user_uuid, created_at)`
   Add the rest when a query needs it, not before.
8. **Ownership + RLS.** Keep `user_uuid` on every table and add:
   ```sql
   ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
   CREATE POLICY own ON messages
     USING (user_uuid = current_setting('app.user_id', true)::uuid);
   ```
   The API sets `app.user_id` per request inside a transaction. This replaces `allow.publicApiKey` × 65.
9. **Do not port derived flags** (`hasFlashcardsOrQuizzes`, `documentCount`, `Chat.hideInRecent`) unless something reads them. Compute instead — they are the denormalization cost Dynamo imposed.
10. **Skip `MemoryBlock`/`MemoryCandidate`/`BatchProcess` in phase 1** if the feature is not shipped for the local version.

---

## 4. Migration steps

**Phase 0 — scope (½ day)**
Decide: all users, or only active ones? Which tables are in v1? (Suggested v1: `UserProfile`, `Space`, `SpaceUsers`, `Document`, `Chat`, `Message`, `ChatCitation`, `Task`.)

**Phase 1 — export (1 day)**
One script per table using DynamoDB `Scan` with pagination → JSONL files on disk. Store the raw export; never touch the source.

**Phase 2 — shape (1–2 days)**
- Parse timestamps → ISO/timestamptz
- Keep embedded objects as-is for `jsonb`
- Scan enums for out-of-range values; record them
- Detect orphans (child rows whose parent is gone); record, then decide: drop, re-home, or set null

**Phase 3 — schema (1 day)**
Drizzle schema + `drizzle-kit generate` → committed SQL migration files.

**Phase 4 — load (1 day)**
`COPY` from the JSONL (fastest) or batched inserts. Load parents before children.

**Phase 5 — verify (1–2 days)**
- Row count per table: Dynamo vs Postgres
- Per-user counts for the top 100 users
- Replay 10 real screens' queries and compare results with the old app
- Check that no `user_uuid` is null where it should not be

**Phase 6 — cutover (one window)**
Freeze writes. Re-export rows where `updatedAt` changed since Phase 1 (delta). Load delta. Switch the app. Keep Dynamo **read-only** for 2 weeks as rollback.

**Total:** ~1 week of focused work, one-way, with a 2-week rollback tail.

---

## 5. Migrations going forward

Drizzle owns schema changes: edit the schema → `drizzle-kit generate` → commit the SQL file → apply in order. Reviewable, diffable, and no schema is ever "generated by a platform you don't control" — which is the whole point of leaving Amplify.

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| Orphans (no FKs today) | Phase 2 detection; fix before adding constraints |
| Enum values outside the declared list | scan in Phase 2; widen the type instead of failing |
| Duplicate/re-keyed rows from composite PKs | import validates uniqueness before adding the PK |
| Two apps writing during cutover | write freeze + delta export |
| PII in exported files (`users.json` already exists in the repo) | keep exports out of git; delete after verification |
| Volume unknown | measure `Scan` counts per table in Phase 1 before planning the window |

---

## 7. Open questions

1. All users or active users only?
2. Which tables are in the local v1? (recommend the 8 above)
3. Do we need the full history (`UserRequest` is an AI-call audit log and may be the largest table by far) — or only a 90-day window?
4. Is `users.json` (30 MB, repo root) a real export, and is it the intended seed data?
