# AWS inventory — findings

Source: `scripts/aws-inventory.sh` against account `713881793844`, region `eu-west-2`.
Read-only (Describe/List/Get/ListTags). No rows were read.

---

## 1. Which table set is which

Amplify names tables `<Model>-<dataBackendId>-NONE`. Two backend ids exist here, and
the stack tags on the tagged tables confirm the mapping:

| suffix | environment | evidence |
|---|---|---|
| `-e5zkpg67jvezvmxgyuoq2awjty-` | **dev** (`main-branch-80d3eb26`) | `Environment=main` on Metadata, Flashcard, UserProfile, MemoryBlock, DatalabRequest, SpaceUsers, ExtractedQuestion |
| `-shq3giqnkzcpjkd4lgxh3yfjq4-` | **RELEASE / production** | `Environment=release` on the same tables |

**Nothing in any script may touch the `shq3…` suffix.**

Other tables in the account are unrelated systems and must be excluded by name:
`monitoring-*` (another product), `prod-ChatTable` / `prod-UserTable` /
`prod-EducationPlanTable`, `dev-Proto*`, `terraform-locks`, and
`pietros-macbook-pro-data*` (someone's personal sandbox).

## 2. Size

| | tables | rows | size |
|---|---|---|---|
| **dev** (`e5zkp…`) | 37 | **~13,700** | ~5 MB |
| **RELEASE** (`shq3…`) | 38 | **~1.94 M** | **~2.5 GB** |
| unrelated (`monitoring`, `prod-*`, proto, locks) | 15 | ~1.07 M | ~250 MB |

**Dev is trivially migratable** — one afternoon, mostly writing the loader.
Production is a real job, and it is dominated by one table.

## 3. The whale is not what I said

I predicted `UserRequest`. It isn't:

| table (prod) | rows | size | share of prod rows |
|---|---|---|---|
| **`DocumentVisionOutput`** | **1,552,189** | **776 MB** | **80%** |
| `UserRequest` | 394,072 | 209 MB | 20% |
| `Message` | 364,728 | 575 MB | 19% |
| `Metadata` | 261,259 | 70 MB | 13% |
| `Flashcard` | 226,428 | 125 MB | 12% |
| `UserActionLog` | 211,124 | 55 MB | 11% |
| `Task` | 206,604 | 328 MB | 11% |
| `QuizQuestion` | 100,671 | 79 MB | 5% |
| `MemoryCandidate` | 67,668 | 44 MB | 3% |
| `Question` | 47,917 | 40 MB | 2% |
| `Chat` | 38,323 | 10 MB | 2% |
| `MemoryBlock` | 37,245 | 433 MB | 2% |
| `UserProfile` | **28,603** | 8 MB | — |
| `Document` | 27,174 | 14 MB | |

`DocumentVisionOutput` is per-page layout-detection output: ~57 rows per document.
**Recommendation: do not migrate it.** It is regenerable from the source PDF and
it is 80% of the migration for a feature (vision layout) that isn't rebuilt.

That single decision takes production from ~1.94 M rows to **~390 k rows / ~1.5 GB**.

## 4. Commerce is barely used in production

| table | prod rows |
|---|---|
| `CurioSubscription` | 168 |
| `Purchase` | 4 |
| `Receipt` | 4 |
| `Bundle` | 2 |
| `ExamModule` | 4 |

168 paid subscriptions against 28,603 profiles. Relevant when someone argues
that payments are urgent — they aren't, but the *data* is tiny either way.

## 5. Schema drift the code doesn't show

Three GSIs use **composite virtual attributes**, which the Drizzle schema does not
model yet. The old UI calls these access patterns by name, so they must be
reproduced (as `ORDER BY` on two columns, or a generated column):

| table | GSI | sort key |
|---|---|---|
| `SpaceUsers` | `spaceUsersBySpaceUuidAndLevelAndCreatedAt` | `level#createdAt` |
| `MemoryBlock` | `memoryBlocksByOwnerUuidAndBlockTypeAndUpdatedAt` | `blockType#updatedAt` |
| `ExtractedQuestion` | `extractedQuestionsByQuestionExtractJobUuidAndModuleNumberAndQuestionNumber` | `moduleNumber#questionNumber` |

Also note the legacy `gsi-<Parent>.<field>` indexes (e.g. `gsi-Chat.messages`,
`gsi-Document.tasks`). They duplicate the newer `…ByXAndCreatedAt` indexes. They
exist only for Amplify v1 relationship resolution and can be ignored.

Everything else matched `amplify/data/resource.ts`: primary keys, the composite
keys on `UserRequest`/`Flashcard`/`Question`/`Purchase`, and the plain
`…ByXAndCreatedAt` GSIs.

## 6. Other infrastructure facts

- **Billing**: every table is `PAY_PER_REQUEST` (no provisioned capacity to reason about).
- **Streams**: enabled on all Curio tables (they only fed the lambda fan-out we replaced).
- **Environments**: two Amplify backends deployed (`main-branch` = dev, `release-branch` = prod),
  each with a duplicate `…aa3fe` backend — an older deployment still standing.
- **Queues/Step Functions**: `…documentprocessingmainStateMachineStack…` (dev) and
  `…releaseStateMachineStack…` (prod) exist per environment.
- **ECS**: `dev-curio-ecs-cluster`, `live-curio-ecs-cluster`.
- **Neptune**: `neptune-dev`, `neptune-prod` still deployed (the graph DB the schema
  migrated away from). Dead weight with ongoing cost.
- **Cognito**: 4 pools — `dev-curio` plus three named `curioai`. Which of the
  `curioai` pools is live needs confirming before any user migration.

## 7. What this means for the plan

1. **Migrate dev first** — 13,700 rows, a few MB. It validates the whole pipeline
   (export → transform → load → verify) with no risk.
2. **Exclude `DocumentVisionOutput`** from the production run. Decide explicitly,
   in writing, before the export.
3. **Ask for the production user counts per Cognito pool** (`list-users` count) —
   28,603 profiles across 4 pools means at least one pool is stale, and the
   mapping from Cognito `sub` to `UserProfile.userUuid` must be exact.
4. **Fix the three composite-sort-key indexes** in the Drizzle schema before the load,
   not after.
5. `UserRequest` can be windowed (last 90 days) if migration time matters; it is
   audit data, and the app only needs recent rows for rate limits.
