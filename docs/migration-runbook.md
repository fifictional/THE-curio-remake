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

## 4. Tables deliberately not imported yet

No Postgres table exists for these, so they are reported as "not modelled yet" and skipped
rather than silently dropped:

`DocumentSection`, `SATMiniExamLog`, `FlashcardGame`, `Partnership`, `FutureUser`,
`BatchProcess`, `DatalabRequest`, `ExamPaper`, `ExamPaperQuestion`, `QuestionExtractJob`,
`QuestionGenerationJob`, `ExtractedQuestion`, `MockDocument`, `AppSettings`,
`UserLearningProfileHistory`.

Add a `pgTable` + a `SPECS` entry for each before a production run needs them.

## 5. Production, when the decisions are made

Blocked on: `DocumentVisionOutput` include/exclude, password strategy, staging database,
and a write freeze. The mechanical parts are the same as above, with two additions that
dev does not exercise:

1. **Delta sync** — after the freeze, re-export only rows changed since the first pass
   (`updatedAt` watermark) and import again.
2. **Rollback window** — keep Dynamo read-only for two weeks.
