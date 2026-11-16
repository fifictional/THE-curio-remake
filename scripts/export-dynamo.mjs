#!/usr/bin/env node
/**
 * Export DynamoDB tables to NDJSON for the Postgres migration.
 *
 * READ ONLY: this script only ever calls Scan and DescribeTable. It contains no
 * Put/Update/Delete path, and it refuses to run against the release backend
 * unless you pass --allow-release on purpose.
 *
 *   node scripts/export-dynamo.mjs                    # dev, all tables
 *   node scripts/export-dynamo.mjs --limit 50          # smoke run, 50 rows/table
 *   node scripts/export-dynamo.mjs --tables Chat,Message
 *   node scripts/export-dynamo.mjs --allow-release     # production (needs a reason)
 *
 * Resumable: progress is checkpointed per table in <out>/.checkpoints.json, so a
 * dropped connection continues where it stopped instead of starting over.
 *
 * Output: one NDJSON file per table, values already unmarshalled to plain JSON
 * (so the importer does not need DynamoDB types), plus a manifest with counts.
 */

import { DynamoDBClient, DescribeTableCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { join } from 'node:path';

const REGION = process.env.AWS_REGION ?? 'eu-west-2';

/** Amplify tables end with `<Model>-<dataBackendId>-NONE`. */
const BACKENDS = {
  dev: 'e5zkpg67jvezvmxgyuoq2awjty',
  // Production. Never touched unless --allow-release is passed explicitly.
  release: 'shq3giqnkzcpjkd4lgxh3yfjq4',
};

/** Tables to migrate, in dependency order is the importer's job, not ours. */
const TABLES = [
  'UserProfile',
  'Space',
  'SpaceUsers',
  'Document',
  'DocumentSummary',
  'DocumentSection',
  'DocumentVisionOutput',
  'Chat',
  'Message',
  'ChatCitation',
  'Flashcard',
  'FlashcardDeck',
  'FlashcardGame',
  'Question',
  'Quiz',
  'QuizQuestion',
  'QuizAttempt',
  'MockExam',
  'MockExamLog',
  'SATMiniExamLog',
  'YoutubeVideo',
  'Task',
  'UserRequest',
  'UserActionLog',
  'Metadata',
  'MemoryBlock',
  'MemoryCandidate',
  'Bundle',
  'ExamModule',
  'Receipt',
  'Purchase',
  'CurioSubscription',
  'Partnership',
  'FutureUser',
  'BatchProcess',
  'DatalabRequest',
  'ExamPaper',
  'ExamPaperQuestion',
  'QuestionExtractJob',
  'QuestionGenerationJob',
  'ExtractedQuestion',
  'MockDocument',
  'AppSettings',
  'UserLearningProfileHistory',
];

function parseArgs(argv) {
  const args = { env: 'dev', out: 'docs/migration/raw', limit: 0, tables: TABLES, allowRelease: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--env') args.env = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--limit') args.limit = Number(argv[++i] ?? 0);
    else if (a === '--tables') args.tables = String(argv[++i]).split(',').map((t) => t.trim());
    else if (a === '--allow-release') args.allowRelease = true;
    else if (a === '--help' || a === '-h') {
      console.log('usage: export-dynamo.mjs [--env dev|release] [--out dir] [--limit n] [--tables A,B] [--allow-release]');
      process.exit(0);
    } else {
      console.error(`unknown argument: ${a}`);
      process.exit(1);
    }
  }
  return args;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Back off on throttling; DynamoDB will throttle a 1.9M-row scan. */
async function scanPage(client, params, attempt = 0) {
  try {
    return await client.send(new ScanCommand(params));
  } catch (err) {
    const name = err?.name ?? '';
    const retryable =
      name === 'ProvisionedThroughputExceededException' ||
      name === 'ThrottlingException' ||
      name === 'RequestLimitExceeded' ||
      name === 'InternalServerError';
    if (!retryable || attempt >= 8) throw err;
    const wait = Math.min(30_000, 500 * 2 ** attempt);
    console.warn(`    throttled (${name}) — retrying in ${wait}ms`);
    await sleep(wait);
    return scanPage(client, params, attempt + 1);
  }
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

async function main() {
  const args = parseArgs(process.argv);

  if (!BACKENDS[args.env]) {
    console.error(`unknown env "${args.env}" — expected dev or release`);
    process.exit(1);
  }
  if (args.env === 'release' && !args.allowRelease) {
    console.error(
      'refusing to export the release backend without --allow-release.\n' +
        'Production exports belong in a staging database, not a laptop.',
    );
    process.exit(1);
  }

  await mkdir(args.out, { recursive: true });
  const checkpointPath = join(args.out, '.checkpoints.json');
  const checkpoints = await readJson(checkpointPath, {});

  const client = new DynamoDBClient({ region: REGION });
  const suffix = BACKENDS[args.env];
  const manifest = { env: args.env, region: REGION, startedAt: new Date().toISOString(), tables: {} };

  console.log(`exporting ${args.env} (${suffix}) from ${REGION} → ${args.out}`);

  for (const model of args.tables) {
    const TableName = `${model}-${suffix}-NONE`;
    const file = join(args.out, `${model}.ndjson`);

    try {
      await client.send(new DescribeTableCommand({ TableName }));
    } catch (err) {
      if (err?.name === 'ResourceNotFoundException') {
        console.log(`  ${model}: not deployed, skipped`);
        manifest.tables[model] = { status: 'missing' };
        continue;
      }
      throw err;
    }

    // Resume: truncate nothing, append from the checkpoint instead.
    const existing = await readJson(checkpointPath, {});
    const checkpoint = existing[model];
    let ExclusiveStartKey = checkpoint?.lastKey;
    let written = checkpoint?.written ?? 0;
    if (written > 0) {
      console.log(`  ${model}: resuming after ${written} rows`);
    } else {
      await writeFile(file, '');
    }

    const stream = createWriteStream(file, { flags: 'a' });
    let pages = 0;
    let stop = false;

    do {
      const res = await scanPage(client, {
        TableName,
        Limit: 500,
        ExclusiveStartKey,
        ConsistentRead: false,
      });

      for (const item of res.Items ?? []) {
        stream.write(`${JSON.stringify(unmarshall(item))}\n`);
        written += 1;
        if (args.limit > 0 && written >= args.limit) {
          stop = true;
          break;
        }
      }

      ExclusiveStartKey = res.LastEvaluatedKey;
      pages += 1;

      // Checkpoint after every page so a crash costs at most 500 rows.
      const latest = await readJson(checkpointPath, {});
      latest[model] = { lastKey: ExclusiveStartKey, written };
      await writeFile(checkpointPath, JSON.stringify(latest, null, 2));

      if (pages % 20 === 0) console.log(`    ${model}: ${written} rows…`);
    } while (ExclusiveStartKey && !stop);

    await new Promise((resolve) => stream.end(resolve));

    manifest.tables[model] = { status: stop ? 'partial' : 'complete', written };
    console.log(`  ${model}: ${written} rows${stop ? ' (limited)' : ''}`);
  }

  manifest.finishedAt = new Date().toISOString();
  await writeFile(join(args.out, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const total = Object.values(manifest.tables).reduce((sum, t) => sum + (t.written ?? 0), 0);
  console.log(`\ndone: ${total} rows across ${Object.keys(manifest.tables).length} tables`);
  console.log(`manifest: ${join(args.out, 'manifest.json')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
