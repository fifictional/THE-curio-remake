# Migration runbook — DynamoDB → Postgres

Two scripts: one reads AWS, one writes Postgres. Neither does anything else.

## 0. Preconditions

```bash
npm run db:up            # postgres:5433
npm run db:migrate       # schema
npm run db:rls           # policies + curio_app role
aws sts get-caller-identity
```

The exporter needs AWS credentials with `dynamodb:Scan`, `dynamodb:DescribeTable`.

## 1. Export (read-only)

```bash
# rehearsal against dev (13.7k rows)
npm run migrate:export

# smoke test: 50 rows per table
npm run migrate:export -- --limit 50

# one or two tables
npm run migrate:export -- --tables Chat,Message
```

- Writes `docs/migration/raw/<Model>.ndjson` (one JSON object per line, values already
  unmarshalled) plus `manifest.json` with row counts.
- **Resumable:** progress is checkpointed per table every 500 rows in
  `docs/migration/raw/.checkpoints.json`. Re-running continues from the last key.
- **Throttled?** It backs off exponentially, up to 8 attempts, and prints each retry.
- **Production is refused** unless you pass `--allow-release`. That is deliberate: production
  data belongs in a staging database, not on a laptop.

Restart a table from scratch: delete its `.ndjson` file and its entry in
`.checkpoints.json`.

## 2. Import

```bash
# rehearsal: wipe the target tables first
npm run migrate:import -- --truncate

# verification only (no writes)
npm run migrate:import -- --verify-only
```

Reads `docs/migration/raw`, loads in foreign-key order, and prints a table with
`source / inserted / inTable / quarantined` per model.

**What the importer does with awkward data**

| Situation | Behaviour |
|---|---|
| `__typename` on every row | dropped (keys that are not columns are ignored) |
| `level#createdAt`, `blockType#updatedAt` | stored verbatim in `level_created_at`, `block_type_updated_at` |
| `MemoryBlock.payload` split into a character map | rebuilt by sorting integer keys, joined, `JSON.parse`d |
| `MemoryBlock.payload` unrepairable | stored as `{"__unparsed": "…"}` and the row still lands |
| Composite Dynamo keys (`UserRequest`, `Purchase`) | deterministic UUID derived from the key, so re-runs do not duplicate |
| A row that fails | written to `import_quarantine` with the reason; the table continues |
| Re-run | `on conflict do nothing`; `inserted` honestly reports 0 |

## 2b. Dry-run without AWS

`npm run migrate:fixture` builds a fixture from the real row shapes (including a
corrupted `MemoryBlock.payload` and a message with no `userUuid`), imports it into
the local database with `--truncate`, and reports quarantine counts. Use it to
regression-test the importer after any transform change — no credentials needed.

## 2c. Orphans: preserved, reported, never dropped

DynamoDB had no foreign keys, so dev contains rows whose parent was deleted —
1,993 of them on the first real run. Dropping them would silently lose data, so
the loader runs with `session_replication_role = replica` (foreign keys off) and
then reports what is orphaned:

```
orphans (rows whose parent is missing):
  messages: 243 → missing chats
  flashcards: 198 → missing users
  ...
  details: docs/migration/orphans.json
```

`--strict` enforces the foreign keys instead and quarantines the offenders.

Rows that cannot be coerced at all are quarantined with a reason:
`Message` rows whose `chatUuid` is `"probe-verify-1"` (someone's test data, not a
uuid) — 2 rows. Nullable foreign keys holding `"undefined"` are nulled instead of
rejecting the whole row.

## 2d. Logging in as an imported user

Cognito hashes cannot be verified by Better Auth, so imported users cannot log in
as-is. For local work, attach a credential to **one** existing user:

```bash
npm run migrate:adopt -- --list
npm run migrate:adopt -- --email test@curio.to --password localpass123
```

Then sign in at `http://localhost:3300/signin` and the app shows the migrated
documents, chats and flashcards. This is a local convenience, **not** the
production password strategy.

## 2e. Storage objects (S3 → `.local/files`)

The database points at S3 keys; the server serves objects from disk. Without
this step every migrated document 404s when opened.

```bash
# what would move?
npm run migrate:objects -- --bucket <dev-bucket> --dry-run

# do it
npm run migrate:objects -- --bucket <dev-bucket>
```

- **Read-only on S3** — it lists and downloads, never writes, and refuses a
  bucket whose name looks like release unless `--allow-release` is passed.
- Copies only the prefixes the rows reference (`student-documents/`,
  `yt-transcripts/`); `exam-papers/`, `generated-images/`, `exports/` belong to
  features that are not modelled yet and are left alone.
- Keys match the disk layout, so there is no rewriting: `s3://b/<key>` becomes
  `.local/files/<key>`.
- Within a prefix the copy is one `aws s3 cp --recursive`; unreferenced objects
  come along and are *counted* in the report so they can be pruned.
- Verifies every referenced key exists on disk afterwards, and writes
  `docs/migration/objects.json`.

Dev result (2026-11-16): 356 referenced keys → 299 copied (204 MB), 57 referenced
but **absent from the bucket** (all `documents.original_key`), 1,387 objects in
the prefixes that nothing references.

## 3. Verify

```sql
-- row counts per table vs manifest.json
select 'users' t, count(*) from users
union all select 'chats', count(*) from chats
union all select 'messages', count(*) from messages;

-- quarantined rows, and why
select source_table, count(*), min(reason)
from import_quarantine group by 1 order by 2 desc;

-- spot check one real user end to end
select u.email, count(distinct c.chat_uuid) chats, count(m.message_uuid) msgs
from users u join chats c on c.user_uuid = u.id
left join messages m on m.chat_uuid = c.chat_uuid
group by 1 order by 3 desc limit 5;
```

## 4. Every model has a table

All 44 DynamoDB models in `scripts/export-dynamo.mjs` now have a `pgTable` and a
`SPECS` entry, so the importer no longer prints "not modelled yet" and no source
row is skipped for lack of a destination.

Five of the new tables are **empty in dev**, so their shapes come from
`amplify/data/resource.ts` in the old repo rather than from rows:
`DocumentSection`, `SATMiniExamLog`, `FlashcardGame`, `QuestionGenerationJob`,
`UserLearningProfileHistory`. A production run will be the first real test of those.

Three shape findings worth knowing:

- `ExtractedQuestion.extractedQuestionUuid` is **text, not uuid** — real ids look like
  `<uuid>_m3_q4`. A uuid column would have quarantined all 120 dev rows.
- `DatalabRequest.taskToken` is a Step Functions token (an expired secret). The column
  exists for shape fidelity; the importer writes `null`.
- `moduleNumber#questionNumber` (an Amplify composite sort key) is stored verbatim in
  `extracted_questions.module_number_question_number`, same as `level#createdAt`.

Access for the new tables is decided in `server/db/rls.ts`, not by the routes:

| Treatment | Tables |
|---|---|
| `user_uuid` policy | sat_mini_exam_logs, flashcard_games, datalab_requests, exam_papers, question_extract_jobs, question_generation_jobs, user_learning_profile_history |
| via `documents` | document_sections |
| via `exam_papers` | exam_paper_questions |
| read-only for everyone | partnerships, app_settings, mock_documents |
| read: everyone, write: via the owning job | extracted_questions |
| no policy — owner only | future_users (PII), batch_processes (internal state) |

The two "owner only" tables are not in the `/db` bridge registry either: the old UI
returns an empty result for them, exactly as it did before they had tables, until the
product has a role model. 12 `exam_papers` and 4 `datalab_requests` come from the export
as orphans (their document was deleted) — preserved, and reported in `orphans.json`.

## 5. Production, when the decisions are made

Blocked on: `DocumentVisionOutput` include/exclude, password strategy, staging database,
and a write freeze. The mechanical parts are the same as above, with two additions that
dev does not exercise:

1. **Delta sync** — after the freeze, re-export only rows changed since the first pass
   (`updatedAt` watermark) and import again.
2. **Rollback window** — keep Dynamo read-only for two weeks.
