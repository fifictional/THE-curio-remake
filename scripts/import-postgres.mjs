#!/usr/bin/env node
/**
 * Load exported DynamoDB NDJSON into Postgres.
 *
 *   node scripts/import-postgres.mjs --raw docs/migration/raw --truncate
 *   node scripts/import-postgres.mjs --verify-only
 *
 * Design notes:
 *  - Rows are staged through `json_populate_recordset(null::<table>, $json)`, which
 *    ignores keys the table does not have (so `__typename` disappears for free)
 *    and lets Postgres do the type coercion (ISO strings → timestamptz, arrays,
 *    jsonb).
 *  - A failing batch is retried row by row so one bad row cannot block a table;
 *    the row is written to `import_quarantine` with the reason.
 *  - Nothing is guessed: every table either has a spec here or is reported as
 *    "not modelled yet" so it is visible rather than silently skipped.
 */

import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import 'dotenv/config';
import postgres from 'postgres';

const args = new Set(process.argv.slice(2));
const RAW = (() => {
  const i = process.argv.indexOf('--raw');
  return i > -1 ? process.argv[i + 1] : 'docs/migration/raw';
})();
const TRUNCATE = args.has('--truncate');
const VERIFY_ONLY = args.has('--verify-only');

const DATABASE_URL =
  process.env.DATABASE_URL_OWNER ?? 'postgres://curio:curio@localhost:5433/curio';

const sql = postgres(DATABASE_URL, { max: 5 });

/* -------------------------------------------------------------------------- */
/* transform helpers                                                          */
/* -------------------------------------------------------------------------- */

const ts = (v) => (typeof v === 'string' && v ? new Date(v) : null);
const arr = (v) => (Array.isArray(v) ? v : []);
const num = (v) => (typeof v === 'number' ? v : v === null || v === undefined ? null : Number(v));
const bool = (v) => (typeof v === 'boolean' ? v : null);

/**
 * Production contains MemoryBlock rows where a JSON *string* was stored and
 * Amplify split it into a character-indexed map: {"0":"{","1":"\"",…}.
 * Detect that shape, rebuild the string in numeric order, parse it.
 */
function repairPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  const keys = Object.keys(payload);
  if (keys.length < 20) return payload;
  if (!keys.every((k) => /^\d+$/.test(k))) return payload;

  const rebuilt = keys
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => (typeof payload[k] === 'string' ? payload[k] : ''))
    .join('');

  try {
    return JSON.parse(rebuilt);
  } catch {
    return { __unparsed: rebuilt };
  }
}

/** `"0#2026-01-27T10:15:16.629Z"` → "0#2026-01-27T10:15:16.629Z" (kept verbatim). */
const composite = (v) => (typeof v === 'string' && v ? v : null);

/**
 * `json_populate_recordset` matches JSON keys against *column* names, and our
 * columns are snake_case while the specs read naturally as camelCase.
 */
/**
 * Deterministic UUID from a composite DynamoDB key, so re-running the import
 * produces the same surrogate id instead of duplicating rows.
 */
function uuidFrom(...parts) {
  const hex = createHash('sha1').update(parts.join('\u0000')).digest('hex');
  const variant = ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(18, 20)}-${hex.slice(20, 32)}`;
}

const toSnake = (key) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

const snakeRow = (row) =>
  Object.fromEntries(Object.entries(row).map(([k, v]) => [toSnake(k), v]));

/* -------------------------------------------------------------------------- */
/* table specs, in load order                                                 */
/* -------------------------------------------------------------------------- */

const SPECS = [
  {
    model: 'UserProfile',
    table: 'users',
    pk: 'userUuid',
    map: (r) => ({
      // The primary-key property in the schema is `id`, but the physical column
      // is user_uuid (kept so legacy ids survive). Emit the column name.
      userUuid: r.userUuid,
      email: r.userEmail ?? r.email,
      name: [r.firstName, r.lastName].filter(Boolean).join(' ') || null,
      firstName: r.firstName ?? null,
      lastName: r.lastName ?? null,
      country: r.country ?? null,
      userDescription: r.userDescription ?? null,
      userHelp: r.userHelp ?? null,
      onboardingCompleted: Boolean(r.onboardingCompleted),
      onboardingSkipped: Boolean(r.onboardingSkipped),
      memoryDisabled: Boolean(r.memoryDisabled),
      createdAt: ts(r.createdAt),
      updatedAt: ts(r.updatedAt),
    }),
  },
  {
    model: 'Space',
    table: 'spaces',
    pk: 'spaceUuid',
    map: (r) => ({
      spaceUuid: r.spaceUuid,
      userUuid: r.userUuid,
      name: r.name ?? '',
      createdAt: ts(r.createdAt),
      updatedAt: ts(r.updatedAt),
    }),
  },
  {
    model: 'SpaceUsers',
    table: 'space_users',
    pk: 'spaceUsersUuid',
    map: (r) => ({
      spaceUsersUuid: r.spaceUsersUuid,
      spaceUuid: r.spaceUuid,
      userUuid: r.userUuid,
      level: num(r.level) ?? 0,
      levelCreatedAt: composite(r['level#createdAt']),
      createdAt: ts(r.createdAt),
      updatedAt: ts(r.updatedAt),
    }),
  },
  {
    model: 'YoutubeVideo',
    table: 'youtube_videos',
    pk: 'youtubeVideoUuid',
    optional: true,
    map: (r) => ({
      youtubeVideoUuid: r.youtubeVideoUuid,
      videoId: r.videoId,
      title: r.title,
      transcriptKey: r.transcriptKey,
      thumbnailUrl: r.thumbnailUrl,
      createdAt: ts(r.createdAt),
      updatedAt: ts(r.updatedAt),
    }),
  },
  {
    model: 'Document',
    table: 'documents',
    pk: 'documentUuid',
    map: (r) => ({
      documentUuid: r.documentUuid,
      userUuid: r.userUuid,
      spaceUuid: r.spaceUuid ?? null,
      youtubeVideoUuid: r.youtubeVideoUuid ?? null,
      key: r.key ?? '',
      originalKey: r.originalKey ?? null,
      fileName: r.fileName ?? '',
      type: r.type ?? 'file',
      hasRagEmbeddings: Boolean(r.hasRagEmbeddings),
      flashcardDeckUuid: r.flashcardDeckUuid ?? null,
      documentCount: num(r.documentCount),
      createdAt: ts(r.createdAt),
      updatedAt: ts(r.updatedAt),
    }),
  },
  {
    model: 'DocumentSummary',
    table: 'document_summaries',
    pk: 'documentSummaryUuid',
    map: (r) => ({
      documentSummaryUuid: r.documentSummaryUuid,
      documentUuid: r.documentUuid,
      title: r.title ?? '',
      summary: r.summary ?? '',
      tags: arr(r.tags),
      keyConcepts: arr(r.keyConcepts),
      markdown: r.markdown ?? null,
      enrichedMarkdown: r.enrichedMarkdown ?? null,
      vote: r.vote ?? null,
      status: r.status ?? 'completed',
      createdAt: ts(r.createdAt),
      updatedAt: ts(r.updatedAt),
    }),
  },
  {
    model: 'DocumentVisionOutput',
    table: 'document_vision_outputs',
    pk: 'documentVisionOutputUuid',
    map: (r) => ({
      documentVisionOutputUuid: r.documentVisionOutputUuid,
      documentUuid: r.documentUuid,
      totalPages: num(r.totalPages),
      pageNumber: num(r.pageNumber),
      bbox: r.bbox ?? null,
      className: r.className ?? null,
      confidence: num(r.confidence),
      caption: r.caption ?? null,
      text: r.text ?? null,
    }),
  },
  {
    model: 'Chat',
    table: 'chats',
    pk: 'chatUuid',
    map: (r) => ({
      chatUuid: r.chatUuid,
      userUuid: r.userUuid,
      spaceUuid: r.spaceUuid ?? null,
      documentUuid: r.documentUuid ?? null,
      name: r.name ?? null,
      hideInRecent: Boolean(r.hideInRecent),
      createdAt: ts(r.createdAt),
      updatedAt: ts(r.updatedAt),
    }),
  },
  {
    model: 'Message',
    table: 'messages',
    pk: 'messageUuid',
    map: (r) => ({
      messageUuid: r.messageUuid,
      chatUuid: r.chatUuid,
      userUuid: r.userUuid ?? null,
      role: r.role === 'assistant' ? 'assistant' : 'user',
      type: r.type === 'tool' ? 'tool' : 'text',
      content: r.content ?? '',
      isCompleted: Boolean(r.isCompleted),
      agentStatus: r.agentStatus ?? null,
      toolName: r.toolName ?? null,
      toolArguments: r.toolArguments ?? null,
      createdAt: ts(r.createdAt),
      updatedAt: ts(r.updatedAt),
    }),
  },
  {
    model: 'ChatCitation',
    table: 'chat_citations',
    pk: 'chatCitationUuid',
    map: (r) => ({
      chatCitationUuid: r.chatCitationUuid,
      chatUuid: r.chatUuid,
      messageUuid: r.messageUuid,
      userUuid: r.userUuid ?? null,
      type: r.type ?? 'url_citation',
      title: r.title ?? '',
      url: r.url ?? '',
      startIndex: num(r.startIndex) ?? 0,
      endIndex: num(r.endIndex) ?? 0,
      createdAt: ts(r.createdAt),
      updatedAt: ts(r.updatedAt),
    }),
  },
  {
    model: 'FlashcardDeck',
    table: 'flashcard_decks',
    pk: 'flashcardDeckUuid',
    map: (r) => ({
      flashcardDeckUuid: r.flashcardDeckUuid,
      userUuid: r.userUuid,
      title: r.title ?? null,
      description: r.description ?? null,
      flashcards: r.flashcards ?? null,
      createdAt: ts(r.createdAt),
      updatedAt: ts(r.updatedAt),
    }),
  },
  {
    model: 'Flashcard',
    table: 'flashcards',
    pk: 'flashcardUuid',
    map: (r) => ({
      flashcardUuid: r.flashcardUuid,
      userUuid: r.userUuid,
      spaceUuid: r.spaceUuid ?? null,
      chatUuid: r.chatUuid ?? null,
      documentUuid: r.documentUuid ?? null,
      title: r.title ?? '',
      content: r.content ?? '',
      references: r.references ?? null,
      vote: r.vote ?? null,
      createdAt: ts(r.createdAt),
      updatedAt: ts(r.updatedAt),
    }),
  },
  {
    model: 'Question',
    table: 'questions',
    pk: 'questionUuid',
    map: (r) => ({
      questionUuid: r.questionUuid,
      userUuid: r.userUuid,
      spaceUuid: r.spaceUuid ?? null,
      chatUuid: r.chatUuid ?? null,
      documentUuid: r.documentUuid ?? null,
      questionContent: r.questionContent ?? '',
      questionReferences: r.questionReferences ?? null,
      options: arr(r.options),
      answer: num(r.answer) ?? 0,
      hint: r.hint ?? null,
      answerExplanations: arr(r.answerExplanations),
      vote: r.vote ?? null,
      createdAt: ts(r.createdAt),
      updatedAt: ts(r.updatedAt),
    }),
  },
  {
    model: 'Quiz',
    table: 'quizzes',
    pk: 'quizUuid',
    map: (r) => ({
      quizUuid: r.quizUuid,
      userUuid: r.userUuid,
      state: r.state ?? 'completed',
      title: r.title ?? null,
      description: r.description ?? null,
      difficulty: r.difficulty ?? null,
      sourceType: r.sourceType ?? null,
      sourceUuid: r.sourceUuid ?? null,
      questionCount: num(r.questionCount) ?? 0,
      lastScore: num(r.lastScore),
      lastTotal: num(r.lastTotal),
      createdAt: ts(r.createdAt),
      updatedAt: ts(r.updatedAt),
    }),
  },
  {
    model: 'QuizQuestion',
    table: 'quiz_questions',
    pk: 'quizQuestionUuid',
    map: (r) => ({
      quizQuestionUuid: r.quizQuestionUuid,
      quizUuid: r.quizUuid,
      userUuid: r.userUuid,
      sourceType: r.sourceType ?? null,
      sourceUuid: r.sourceUuid ?? null,
      questionContent: r.questionContent ?? '',
      questionReferences: r.questionReferences ?? null,
      options: arr(r.options),
      hint: r.hint ?? null,
      answerExplanations: arr(r.answerExplanations),
      vote: r.vote ?? null,
    }),
  },
  {
    model: 'QuizAttempt',
    table: 'quiz_attempts',
    pk: 'quizAttemptUuid',
    map: (r) => ({
      quizAttemptUuid: r.quizAttemptUuid,
      quizUuid: r.quizUuid,
      userUuid: r.userUuid,
      score: num(r.score) ?? 0,
      total: num(r.total) ?? 0,
      createdAt: ts(r.createdAt),
      updatedAt: ts(r.updatedAt),
    }),
  },
  {
    model: 'MockExam',
    table: 'mock_exams',
    pk: 'mockExamUuid',
    map: (r) => ({
      mockExamUuid: r.mockExamUuid,
      userUuid: r.userUuid,
      spaceUuid: r.spaceUuid ?? null,
      chatUuid: r.chatUuid ?? null,
      title: r.title ?? '',
      examName: r.examName ?? null,
      mockExamInfo: r.mockExamInfo ?? null,
      questions: r.questions ?? null,
      creationStatus: r.creationStatus ?? 'GENERATED',
      createdAt: ts(r.createdAt),
      updatedAt: ts(r.updatedAt),
    }),
  },
  {
    model: 'MockExamLog',
    table: 'mock_exam_logs',
    pk: 'mockExamLogUuid',
    map: (r) => ({
      mockExamLogUuid: r.mockExamLogUuid,
      mockExamUuid: r.mockExamUuid,
      questionAnswers: r.questionAnswers ?? null,
      status: r.status ?? 'IN_PROGRESS',
      score: num(r.score) ?? 0,
      startedAt: ts(r.startedAt),
      completedAt: ts(r.completedAt),
      createdAt: ts(r.createdAt),
      updatedAt: ts(r.updatedAt),
    }),
  },
  {
    model: 'Task',
    table: 'tasks',
    pk: 'taskUuid',
    map: (r) => ({
      taskUuid: r.taskUuid,
      documentUuid: r.documentUuid ?? null,
      messageUuid: r.messageUuid ?? null,
      userUuid: r.userUuid,
      status: r.status ?? 'PENDING',
      type: r.type ?? 'DOCUMENT_PROCESSING',
      args: r.args ?? null,
      progress: num(r.progress) ?? 0,
      error: r.error ?? null,
      result: r.result ?? null,
      createdAt: ts(r.createdAt),
      updatedAt: ts(r.updatedAt),
    }),
  },
  {
    model: 'UserRequest',
    table: 'user_requests',
    pk: 'id',
    // Composite PK in Dynamo (userUuid + createdAt) → deterministic uuid.
    map: (r) => ({
      id: uuidFrom('user_request', r.userUuid, r.createdAt ?? ''),
      userUuid: r.userUuid,
      documentUuid: r.documentUuid ?? null,
      model: r.model ?? '',
      category: r.category ?? null,
      feature: r.feature ?? null,
      requestStatus: num(r.requestStatus) ?? 200,
      promptTokenCount: num(r.promptTokenCount) ?? 0,
      candidatesTokenCount: num(r.candidatesTokenCount) ?? 0,
      totalTokenCount: num(r.totalTokenCount) ?? 0,
      latency: num(r.latency),
      createdAt: ts(r.createdAt),
      updatedAt: ts(r.updatedAt),
    }),
  },
  {
    model: 'UserActionLog',
    table: 'user_action_logs',
    pk: 'userActionLogUuid',
    map: (r) => ({
      userActionLogUuid: r.userActionLogUuid,
      userUuid: r.userUuid,
      actionType: r.actionType ?? 'unknown',
      sourceType: r.sourceType ?? null,
      sourceUuid: r.sourceUuid ?? null,
      createdAt: ts(r.createdAt),
    }),
  },
  {
    model: 'Metadata',
    table: 'metadata',
    pk: 'metadataUuid',
    map: (r) => ({
      metadataUuid: r.metadataUuid,
      targetUuid: r.targetUuid,
      targetType: r.targetType,
      name: r.name,
      value: typeof r.value === 'string' ? r.value : JSON.stringify(r.value ?? ''),
      createdAt: ts(r.createdAt),
      updatedAt: ts(r.updatedAt),
    }),
  },
  {
    model: 'MemoryBlock',
    table: 'memory_blocks',
    pk: 'memoryBlockUuid',
    map: (r) => ({
      memoryBlockUuid: r.memoryBlockUuid,
      ownerUuid: r.ownerUuid,
      scope: r.scope ?? 'user',
      scopeId: r.scopeId,
      blockType: r.blockType ?? 'unknown',
      blockTypeUpdatedAt: composite(r['blockType#updatedAt']),
      payload: repairPayload(r.payload),
      topic: r.topic ?? '',
      subject: r.subject ?? null,
      documentUuid: r.documentUuid ?? null,
      confidence: num(r.confidence) ?? 0,
      frequency: num(r.frequency) ?? 1,
      attemptScores: Array.isArray(r.attemptScores) ? r.attemptScores : null,
      attemptDates: Array.isArray(r.attemptDates) ? r.attemptDates : null,
      sources: Array.isArray(r.sources) ? r.sources : null,
      firstSeenAt: ts(r.firstSeenAt),
      lastReinforcedAt: ts(r.lastReinforcedAt),
      version: num(r.version) ?? 1,
      addedFrom: r.addedFrom ?? null,
      isBackfill: bool(r.isBackfill),
      createdAt: ts(r.createdAt),
      updatedAt: ts(r.updatedAt),
    }),
  },
  {
    model: 'MemoryCandidate',
    table: 'memory_candidates',
    pk: 'memoryCandidateUuid',
    map: (r) => ({
      memoryCandidateUuid: r.memoryCandidateUuid,
      ownerUuid: r.ownerUuid,
      scope: r.scope ?? 'user',
      scopeId: r.scopeId,
      proposedBlock: repairPayload(r.proposedBlock),
      decision: r.decision ?? 'rejected',
      mergedIntoUuid: r.mergedIntoUuid ?? null,
      messageUuid: r.messageUuid ?? null,
      chatUuid: r.chatUuid ?? null,
      createdAt: ts(r.createdAt),
      updatedAt: ts(r.updatedAt),
    }),
  },
  {
    model: 'Bundle',
    table: 'bundles',
    pk: 'bundleUuid',
    map: (r) => ({
      bundleUuid: r.bundleUuid,
      name: r.name ?? '',
      description: r.description ?? null,
      order: num(r.order) ?? 0,
      defaultSku: r.defaultSku ?? null,
      additionalSkus: arr(r.additionalSkus),
      modules: arr(r.modules),
      published: Boolean(r.published),
      createdAt: ts(r.createdAt),
      updatedAt: ts(r.updatedAt),
    }),
  },
  {
    model: 'ExamModule',
    table: 'exam_modules',
    pk: 'examModuleUuid',
    map: (r) => ({
      examModuleUuid: r.examModuleUuid,
      moduleName: r.moduleName ?? '',
      questionKeys: arr(r.questionKeys),
      price: num(r.price) ?? 0,
      retired: Boolean(r.retired),
      createdAt: ts(r.createdAt),
      updatedAt: ts(r.updatedAt),
    }),
  },
  {
    model: 'Receipt',
    table: 'receipts',
    pk: 'receiptId',
    map: (r) => ({
      receiptId: r.receiptId,
      userId: r.userId,
      provider: r.provider ?? 'manual',
      payload: typeof r.payload === 'string' ? r.payload : JSON.stringify(r.payload ?? null),
      createdAt: ts(r.createdAt),
      updatedAt: ts(r.updatedAt),
    }),
  },
  {
    model: 'Purchase',
    table: 'purchases',
    pk: 'id',
    map: (r) => ({
      id: uuidFrom('purchase', r.userId, r.bundleUuid ?? ''),
      userId: r.userId,
      bundleUuid: r.bundleUuid ?? null,
      purchasedAt: ts(r.purchasedAt),
      source: r.source ?? null,
      receiptId: r.receiptId ?? null,
      revokedAt: ts(r.revokedAt),
      createdAt: ts(r.createdAt),
      updatedAt: ts(r.updatedAt),
    }),
  },
  {
    model: 'CurioSubscription',
    table: 'curio_subscriptions',
    pk: 'subscriptionId',
    map: (r) => ({
      subscriptionId: r.subscriptionId,
      userId: r.userId,
      provider: r.provider ?? 'manual',
      status: r.status ?? 'active',
      tier: r.tier ?? 'super',
      providerSubscriptionId: r.providerSubscriptionId ?? null,
      providerCustomerId: r.providerCustomerId ?? null,
      currentPeriodStart: ts(r.currentPeriodStart),
      currentPeriodEnd: ts(r.currentPeriodEnd),
      nextBillingDate: ts(r.nextBillingDate),
      cancelledAt: ts(r.cancelledAt),
      pausedAt: ts(r.pausedAt),
      createdAt: ts(r.createdAt),
      updatedAt: ts(r.updatedAt),
    }),
  },
];

/* -------------------------------------------------------------------------- */
/* loader                                                                     */
/* -------------------------------------------------------------------------- */

async function readNdjson(path) {
  const rows = [];
  await new Promise((resolve, reject) => {
    const stream = createReadStream(path, 'utf8');
    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk;
      let idx;
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (line) rows.push(JSON.parse(line));
      }
    });
    stream.on('end', () => {
      const line = buffer.trim();
      if (line) rows.push(JSON.parse(line));
      resolve();
    });
    stream.on('error', reject);
  });
  return rows;
}

/** Table names come from our own SPECS, but keep the guarantee explicit. */
const SAFE_TABLES = new Set(SPECS.map((s) => s.table));
function assertTable(name) {
  if (!SAFE_TABLES.has(name)) throw new Error(`refusing unknown table: ${name}`);
  return name;
}

/**
 * Explicit column list, deliberately.
 *
 * `json_populate_recordset` fills every column of the row type, inserting NULL
 * for keys the JSON does not carry — which overrides DEFAULTs such as
 * `email_verified`. Naming the columns keeps Postgres defaults intact and makes
 * the insert independent of column order.
 */
function buildInsert(table, keys) {
  const name = assertTable(table);
  const cols = keys.map((k) => `"${k.replace(/"/g, '')}"`).join(', ');
  return `insert into "${name}" (${cols})
          select ${cols} from json_populate_recordset(null::"${name}", $1::json)
          on conflict do nothing`;
}

async function insertRows(spec, rows) {
  const CHUNK = 500;
  let inserted = 0;
  let quarantined = 0;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK).map((r) => snakeRow(spec.map(r)));

    try {
      const result = await sql.unsafe(buildInsert(spec.table, Object.keys(batch[0])), [batch]);
      // `count` is the affected-row count, so a second run honestly reports 0.
      inserted += result.count ?? 0;
    } catch (batchError) {
      // One bad row must not block the table: retry individually.
      for (const row of batch) {
        try {
          const one = await sql.unsafe(buildInsert(spec.table, Object.keys(row)), [[row]]);
          inserted += one.count ?? 0;
        } catch (rowError) {
          quarantined += 1;
          await sql`
            insert into import_quarantine (source_table, reason, raw)
            values (${spec.model}, ${String(rowError.message).slice(0, 500)}, ${sql.json(row)})
          `.catch(() => {});
        }
      }
      if (quarantined === 0) {
        console.warn(`    batch failed then recovered: ${String(batchError.message).slice(0, 120)}`);
      }
    }
  }

  return { inserted, quarantined };
}

async function main() {
  console.log(`raw: ${RAW}`);
  console.log(`db:  ${DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`);

  const available = new Set((await readdir(RAW)).filter((f) => f.endsWith('.ndjson')));
  if (available.size === 0) {
    console.error(`no .ndjson files in ${RAW} — run scripts/export-dynamo.mjs first`);
    process.exit(1);
  }

  const unmodelled = [...available]
    .map((f) => f.replace(/\.ndjson$/, ''))
    .filter((m) => !SPECS.some((s) => s.model === m));

  if (TRUNCATE) {
    console.log('truncating target tables (reverse dependency order)…');
    const tables = [...SPECS].reverse().map((s) => s.table);
    await sql.unsafe(`truncate table ${tables.join(', ')} restart identity cascade`);
  }

  const results = [];

  for (const spec of SPECS) {
    if (!available.has(`${spec.model}.ndjson`)) {
      results.push({ model: spec.model, table: spec.table, status: 'no export' });
      continue;
    }

    const source = await readNdjson(join(RAW, `${spec.model}.ndjson`));
    if (source.length === 0) {
      results.push({ model: spec.model, table: spec.table, status: 'empty', source: 0 });
      continue;
    }

    process.stdout.write(`  ${spec.model} → ${spec.table} (${source.length})… `);
    const { inserted, quarantined } = await insertRows(spec, source);
    const [countRow] = await sql.unsafe(`select count(*)::int as n from ${spec.table}`);
    console.log(`${inserted} inserted, ${countRow.n} in table${quarantined ? `, ${quarantined} quarantined` : ''}`);

    results.push({
      model: spec.model,
      table: spec.table,
      source: source.length,
      inserted,
      inTable: countRow.n,
      quarantined,
      status: quarantined > 0 ? 'partial' : 'ok',
    });
  }

  const [quarantineCount] = await sql.unsafe('select count(*)::int as n from import_quarantine');

  console.log('\nsummary');
  console.table(results);
  if (unmodelled.length) {
    console.log(`not modelled yet (skipped): ${unmodelled.join(', ')}`);
  }
  console.log(`quarantined rows: ${quarantineCount.n}`);

  const bad = results.filter((r) => r.status === 'partial');
  if (bad.length) console.log(`tables with quarantined rows: ${bad.map((r) => r.model).join(', ')}`);

  await sql.end();
}

main().catch(async (err) => {
  console.error(err);
  await sql.end({ timeout: 1 });
  process.exit(1);
});
