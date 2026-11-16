#!/usr/bin/env node
/**
 * Copy S3 objects into local disk storage, for the Postgres re-platform.
 *
 * READ ONLY on S3: this script only lists and downloads. It never writes,
 * deletes, or moves anything in the bucket, and it refuses bucket names that
 * look like release unless you pass --allow-release on purpose.
 *
 *   node scripts/copy-objects.mjs --bucket <name>            # copy what the DB references
 *   node scripts/copy-objects.mjs --bucket <name> --dry-run  # report only
 *
 * Which objects? Only keys referenced by the migrated rows:
 *
 *   documents.key             student-documents/<owner>/<uuid>
 *   documents.original_key    student-documents/<owner>/originals/<uuid>
 *   youtube_videos.transcript_key   student-documents/…  or  yt-transcripts/<videoId>/…
 *
 * Keys already match the local layout (`.local/files/<key>`), so there is no
 * prefix rewriting — the copy is a straight mirror. Everything else in the
 * bucket (exam-papers/, generated-images/, exports/) belongs to features that
 * are not modelled yet, so it is skipped entirely.
 *
 * Within a referenced prefix the copy is `aws s3 cp --recursive` (one command,
 * parallel transfers) rather than 299 single-object calls, so objects that no row
 * references come along too. They are counted in the report, not silently
 * included, so they can be pruned later — and the verification step below still
 * checks every *referenced* key landed on disk.
 *
 * Honest counts, like the importer: referenced / in bucket / copied / missing,
 * plus the objects that exist but nothing references.
 */

import { execFile } from 'node:child_process';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

import 'dotenv/config';
import postgres from 'postgres';

const exec = promisify(execFile);
const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i > -1 ? argv[i + 1] : fallback;
};

const DRY = argv.includes('--dry-run');
const ALLOW_RELEASE = argv.includes('--allow-release');
const BUCKET = arg('bucket', process.env.S3_BUCKET);
const DEST = arg('dest', process.env.FILES_DIR ?? '.local/files');
const REPORT = arg('report', 'docs/migration/objects.json');

const DATABASE_URL =
  process.env.DATABASE_URL_OWNER ?? 'postgres://curio:curio@localhost:5433/curio';

const aws = async (args) => {
  try {
    return await exec('aws', args, { maxBuffer: 256 * 1024 * 1024 });
  } catch (err) {
    const detail = String(err.stderr ?? err.message).trim().split('\n').slice(-3).join('\n');
    throw new Error(`aws ${args[0]} ${args[1]} failed:\n${detail}`);
  }
};

/** All objects under a prefix. One page in dev; the loop is for production. */
async function listObjects(prefix) {
  const objects = [];
  let token;

  for (;;) {
    const args = [
      's3api',
      'list-objects-v2',
      '--bucket',
      BUCKET,
      '--prefix',
      prefix,
      '--output',
      'json',
    ];
    if (token) args.push('--starting-token', token);

    const { stdout } = await aws(args);
    const page = JSON.parse(stdout || '{}');

    for (const obj of page.Contents ?? []) {
      objects.push({ key: obj.Key, size: obj.Size ?? 0 });
    }

    if (!page.NextContinuationToken) return objects;
    token = page.NextContinuationToken;
  }
}

/** The keys the migrated rows point at, with where each one came from. */
async function referencedKeys() {
  const sql = postgres(DATABASE_URL, { max: 2 });
  const referenced = new Map();

  const add = (key, source) => {
    if (typeof key !== 'string') return;
    const cleaned = key.replace(/^\/+/, '').trim();
    if (!cleaned) return;
    if (!referenced.has(cleaned)) referenced.set(cleaned, source);
  };

  try {
    const documents = await sql`
      select key, original_key from documents
    `;
    for (const row of documents) {
      add(row.key, 'documents.key');
      add(row.original_key, 'documents.original_key');
    }

    const videos = await sql`select transcript_key from youtube_videos`;
    for (const row of videos) add(row.transcript_key, 'youtube_videos.transcript_key');
  } finally {
    await sql.end({ timeout: 5 });
  }

  return referenced;
}

const prefixOf = (key) => key.split('/')[0];

async function main() {
  if (!BUCKET) {
    console.error('--bucket is required (or set S3_BUCKET). Refusing to guess.');
    process.exit(1);
  }
  if (/release/i.test(BUCKET) && !ALLOW_RELEASE) {
    console.error(
      `refusing "${BUCKET}" — it looks like the release bucket.\n` +
        'Production files belong in a staging environment. Pass --allow-release if that is really the plan.',
    );
    process.exit(1);
  }

  console.log(`bucket: ${BUCKET}`);
  console.log(`dest:   ${DEST}${DRY ? '  (dry run)' : ''}`);

  const referenced = await referencedKeys();
  const wantedPrefixes = [...new Set([...referenced.keys()].map(prefixOf))].sort();
  console.log(`\nreferenced by the database: ${referenced.size} keys in ${wantedPrefixes.join(', ')}`);

  const inBucket = new Map();
  for (const prefix of wantedPrefixes) {
    const objects = await listObjects(`${prefix}/`);
    for (const obj of objects) inBucket.set(obj.key, obj.size);
    console.log(`  ${prefix}/: ${objects.length} objects`);
  }

  const referencedInBucket = [...referenced.keys()].filter((k) => inBucket.has(k));
  const missingInBucket = [...referenced.keys()].filter((k) => !inBucket.has(k));
  const unreferenced = [...inBucket.keys()].filter((k) => !referenced.has(k)).sort();
  const bytes = referencedInBucket.reduce((sum, k) => sum + inBucket.get(k), 0);

  const missingBySource = missingInBucket.reduce((acc, key) => {
    const source = referenced.get(key);
    acc[source] = (acc[source] ?? 0) + 1;
    return acc;
  }, {});

  console.log(
    `\nreferenced and present: ${referencedInBucket.length} objects, ${(bytes / 1e6).toFixed(1)} MB`,
  );

  if (missingInBucket.length) {
    // A stale `original_key` is a data fact, not a copy failure: dev has rows
    // whose original was renamed on upload (…/uploadedFile.pdf while the object
    // is …/file.pdf). Report it and keep going.
    console.log(`missing from the bucket: ${missingInBucket.length}`);
    for (const [source, count] of Object.entries(missingBySource)) {
      console.log(`  ${source}: ${count}`);
    }
    for (const key of missingInBucket.slice(0, 5)) console.log(`  - ${key}`);
    if (missingInBucket.length > 5) console.log(`  … ${missingInBucket.length - 5} more`);
  }

  if (unreferenced.length) {
    const unreferencedBytes = unreferenced.reduce((sum, key) => sum + inBucket.get(key), 0);
    console.log(
      `in the bucket under those prefixes but unreferenced: ${unreferenced.length} ` +
        `(${(unreferencedBytes / 1e6).toFixed(1)} MB, comes along with the prefix)`,
    );
  }

  let copied = 0;
  if (!DRY && referencedInBucket.length) {
    console.log('\ncopying…');
    for (const prefix of wantedPrefixes) {
      await mkdir(join(DEST, prefix), { recursive: true });
      await aws([
        's3',
        'cp',
        '--recursive',
        `s3://${BUCKET}/${prefix}/`,
        join(DEST, prefix),
        '--only-show-errors',
      ]);
      console.log(`  ${prefix}/ → ${join(DEST, prefix)}`);
    }
  }

  // Verify on disk instead of trusting the copy's exit code. A dry run copies
  // nothing, so it has nothing to verify.
  const missingOnDisk = [];
  if (!DRY) {
    for (const key of referencedInBucket) {
      try {
        const info = await stat(join(DEST, key));
        if (info.isFile()) copied += 1;
        else missingOnDisk.push(key);
      } catch {
        missingOnDisk.push(key);
      }
    }
    console.log(`\non disk: ${copied}/${referencedInBucket.length}`);
  } else {
    console.log(`\nwould copy: ${referencedInBucket.length} objects, ${(bytes / 1e6).toFixed(1)} MB`);
  }

  await mkdir(dirname(REPORT), { recursive: true });
  await writeFile(
    REPORT,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        bucket: BUCKET,
        dest: DEST,
        dryRun: DRY,
        referenced: referenced.size,
        referencedBy: Object.fromEntries(
          [...referenced.values()].reduce(
            (acc, source) => acc.set(source, (acc.get(source) ?? 0) + 1),
            new Map(),
          ),
        ),
        inBucket: inBucket.size,
        copied,
        bytes,
        missingInBucket,
        missingBySource,
        missingOnDisk,
        unreferenced,
        unreferencedBytes: unreferenced.reduce((sum, key) => sum + inBucket.get(key), 0),
      },
      null,
      2,
    ),
  );
  console.log(`report: ${REPORT}`);

  if (missingOnDisk.length) {
    console.error(`\nFAILED: ${missingOnDisk.length} keys still missing on disk`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
