#!/usr/bin/env node
/**
 * Repair `MemoryBlock.payload` rows that Amplify split into a character map.
 *
 * The importer does this on the way in, but that rule originally bailed out when
 * a row carried both the character map and later real keys (`documentUuid`,
 * `askedCount`, …) — which is 46 of 66 dev rows. This script re-applies the fixed
 * rule to rows already in the database, so an existing import can be healed
 * without a full reload.
 *
 *   node scripts/repair-memory-payloads.mjs --dry-run
 *   node scripts/repair-memory-payloads.mjs
 *
 * Idempotent: rows that are already objects are left alone.
 */

import 'dotenv/config';
import postgres from 'postgres';

import { repairPayload } from './lib/repair-payload.mjs';

const DRY = process.argv.includes('--dry-run');
const DATABASE_URL =
  process.env.DATABASE_URL_OWNER ?? 'postgres://curio:curio@localhost:5433/curio';
const sql = postgres(DATABASE_URL, { max: 2 });

const rows = await sql`select memory_block_uuid, payload from memory_blocks`;
let repaired = 0;
let unchanged = 0;

for (const row of rows) {
  const fixed = repairPayload(row.payload);
  if (fixed === row.payload) {
    unchanged += 1;
    continue;
  }
  repaired += 1;
  if (!DRY) {
    await sql`update memory_blocks set payload = ${sql.json(fixed)}, updated_at = now()
              where memory_block_uuid = ${row.memory_block_uuid}`;
  }
}

console.log(`${rows.length} rows: ${repaired} ${DRY ? 'would be repaired' : 'repaired'}, ${unchanged} untouched`);
await sql.end();
