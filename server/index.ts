/**
 * Local API server — the walking skeleton.
 *
 * Runs the repo's real `moveChat` route over plain HTTP, with a fake data
 * client. No Lambda, no AppSync, no AWS credentials, no database.
 *
 * Run:  npm run dev:server
 * Open: http://localhost:3101
 *
 * Routes:
 *   GET  /           — one page, one button (calls POST /moveChat)
 *   GET  /__hello    — smoke check
 *   GET  /__calls    — every data call the fake client recorded
 *   POST /__reset    — clear the recorded calls
 *   POST /moveChat   — the real route, copied from amplify/hono/routes/
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { serve } from '@hono/node-server';

import { createApp } from './app';

const here = dirname(fileURLToPath(import.meta.url));
const indexHtml = readFileSync(join(here, 'public', 'index.html'), 'utf8');

const { app } = createApp();
app.get('/', (c) => c.html(indexHtml));

// 3101 rather than 3001: 3001 is commonly taken by other local dev servers.
const port = Number(process.env.PORT ?? 3101);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`\n  local api → http://localhost:${info.port}`);
  console.log(`  real route: amplify/hono/routes/move-chat.ts (copied)`);
  console.log(`  data:       server/fake-data.ts (no database)\n`);
});
