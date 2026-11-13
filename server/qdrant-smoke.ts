/**
 * Qdrant round-trip smoke test — proves the wire format without needing an
 * embedding key.
 *
 *   npm run qdrant:smoke
 *
 * If OPENAI_API_KEY is set the vectors are real embeddings. If not, the script
 * uses a deterministic pseudo-vector of the same dimensionality, so upsert,
 * payload filtering and search are still exercised end to end. What it cannot
 * prove without a key is *semantic* quality — that is what a real query gives
 * you.
 */

import 'dotenv/config';

import { embed, EMBED_DIMS, hasAiKey } from './ai';
import { COLLECTION, ensureCollection, search, upsert } from './qdrant';

const USER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CHAT = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

/** Deterministic stand-in: same text → same vector, without a provider. */
function pseudoVector(text: string): number[] {
  let seed = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    seed ^= text.charCodeAt(i);
    seed = Math.imul(seed, 16777619) >>> 0;
  }
  const out: number[] = [];
  let state = seed;
  for (let i = 0; i < EMBED_DIMS; i += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    out.push(state / 0xffffffff - 0.5);
  }
  const norm = Math.hypot(...out.slice(0, 512));
  return out.map((v) => v / norm);
}

const vectorFor = (text: string) => (hasAiKey() ? embed(text) : Promise.resolve(pseudoVector(text)));

async function main() {
  console.log(`qdrant: ${process.env.QDRANT_URL ?? 'http://localhost:6433'}`);
  console.log(`embeddings: ${hasAiKey() ? 'openai' : 'deterministic pseudo-vector (no key)'}`);

  await ensureCollection();
  console.log(`collection ${COLLECTION} ready`);

  const a1 = 'Photosynthesis converts light into chemical energy in chloroplasts.';
  const a2 = 'Chlorophyll is the pigment that absorbs light.';
  const b1 = 'Mitochondria produce ATP through respiration.';

  await upsert([
    { id: '11111111-1111-4111-8111-1111111111a1', vector: await vectorFor(a1), payload: { userUuid: USER_A, chatUuid: CHAT, messageUuid: '11111111-1111-4111-8111-1111111111a1', role: 'assistant', text: a1 } },
    { id: '11111111-1111-4111-8111-1111111111a2', vector: await vectorFor(a2), payload: { userUuid: USER_A, chatUuid: CHAT, messageUuid: '11111111-1111-4111-8111-1111111111a2', role: 'assistant', text: a2 } },
    { id: '22222222-2222-4222-8222-2222222222b1', vector: await vectorFor(b1), payload: { userUuid: USER_B, chatUuid: CHAT, messageUuid: '22222222-2222-4222-8222-2222222222b1', role: 'assistant', text: b1 } },
  ]);
  console.log('upserted 3 points (2 for user A, 1 for user B)');

  const query = 'what absorbs light';
  const hitsA = await search(await vectorFor(query), { userUuid: USER_A, limit: 5 });
  const hitsB = await search(await vectorFor(query), { userUuid: USER_B, limit: 5 });

  console.log(`\nuser A hits (${hitsA.length}):`);
  for (const h of hitsA) console.log(`  ${h.score.toFixed(4)}  ${h.text.slice(0, 60)}`);
  console.log(`user B hits (${hitsB.length}):`);
  for (const h of hitsB) console.log(`  ${h.score.toFixed(4)}  ${h.text.slice(0, 60)}`);

  const leak = hitsA.some((h) => h.text === b1);
  const isolationOk = !leak && hitsB.length === 1 && hitsB[0].text === b1;

  // cleanup
  await fetch(
    `${process.env.QDRANT_URL ?? 'http://localhost:6433'}/collections/${COLLECTION}/points/delete?wait=true`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ points: ['11111111-1111-4111-8111-1111111111a1', '11111111-1111-4111-8111-1111111111a2', '22222222-2222-4222-8222-2222222222b1'] }),
    },
  );
  console.log('\npoints cleaned up');

  if (!isolationOk) {
    console.error('\nFAIL: payload filter did not isolate users');
    process.exit(1);
  }
  console.log('PASS: upsert, payload filter and search work; users are isolated');
}

await main();
process.exit(0);
