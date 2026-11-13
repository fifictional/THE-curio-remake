/**
 * Local API server.
 *
 *   npm run dev   →  http://localhost:3101
 *
 * If DATABASE_URL is set, the app uses Postgres (`postgres-data.ts`).
 * Otherwise it falls back to the in-memory fake client so the server still
 * boots for UI work or a quick demo.
 */

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { serve } from '@hono/node-server';

import { createApp } from './app';
import type { HonoDataClient } from './data-client';

const here = dirname(fileURLToPath(import.meta.url));
const indexHtml = readFileSync(join(here, 'public', 'index.html'), 'utf8');

let clientFactory: ((userId: string | null) => HonoDataClient) | undefined;

if (process.env.DATABASE_URL) {
  const { createPostgresDataClient } = await import('./postgres-data');
  // Per-request client: each one runs inside a transaction that sets
  // app.user_id, so Postgres RLS decides what the query can see.
  clientFactory = (userId) => createPostgresDataClient(userId);
  console.log('  data:       postgres + RLS (DATABASE_URL)');
} else {
  console.log('  data:       in-memory fake (no DATABASE_URL)');
}

const { app } = createApp({ clientFactory });
app.get('/', (c) => c.html(indexHtml));

const port = Number(process.env.PORT ?? 3101);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`  local api → http://localhost:${info.port}\n`);
});
