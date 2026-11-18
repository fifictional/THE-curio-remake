#!/usr/bin/env node
/**
 * Production server for the built app.
 *
 * `vite build` emits `dist/server/server.js` (a fetch-style handler) and
 * `dist/client` (static assets). Something has to turn a Node `http` request into
 * that format — that is all this file does:
 *
 *   - static files from dist/client, with long caching for hashed assets
 *   - API paths proxied to API_ORIGIN, so the session cookie stays first-party
 *     (same reason the dev server proxies them; no CORS anywhere)
 *   - everything else handed to the SSR entry
 *
 *   API_ORIGIN=http://api.internal:3101 PORT=3000 node server.mjs
 */

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

import serverEntry from './dist/server/server.js';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';
const API_ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:3101';
const CLIENT_DIR = new URL('./dist/client/', import.meta.url).pathname;

/** The paths the API owns. Keep in sync with vite.config.ts and server/app.ts. */
const API_PREFIXES = [
  '/api',
  '/me',
  '/messages',
  '/aiChat',
  '/moveChat',
  '/rag',
  '/files',
  '/db',
  '/account',
  '/health',
  '/log',
];

const MIME = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

const isApi = (pathname) =>
  API_PREFIXES.some((prefix) =>
    // `/me` must not swallow `/metadata/...` (that bit us in the dev proxy).
    prefix === '/me' ? pathname === '/me' : pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

function collectBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function proxy(req, res, url) {
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await collectBody(req);
  const target = new URL(url.pathname + url.search, API_ORIGIN);

  const upstream = await fetch(target, {
    method: req.method,
    headers: { ...req.headers, host: new URL(API_ORIGIN).host },
    body,
    redirect: 'manual',
  });

  res.writeHead(upstream.status, Object.fromEntries(upstream.headers));
  res.end(Buffer.from(await upstream.arrayBuffer()));
}

async function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;

  const path = normalize(join(CLIENT_DIR, decodeURIComponent(url.pathname)));
  if (!path.startsWith(normalize(CLIENT_DIR))) return false;

  try {
    const info = await stat(path);
    if (!info.isFile()) return false;

    // Hashed filenames never change: cache hard. Anything else: revalidate.
    const hashed = /\.[0-9a-f]{8,}\./.test(path) || path.includes('/_build/');
    res.writeHead(200, {
      'content-type': MIME[extname(path)] ?? 'application/octet-stream',
      'content-length': info.size,
      'cache-control': hashed ? 'public, max-age=31536000, immutable' : 'public, max-age=0',
    });
    if (req.method === 'HEAD') return res.end(), true;
    createReadStream(path).pipe(res);
    return true;
  } catch {
    return false;
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

  try {
    if (isApi(url.pathname)) return await proxy(req, res, url);
    if (await serveStatic(req, res, url)) return;

    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await collectBody(req);
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body,
    });

    const response = await serverEntry.fetch(request, {}, {});
    res.writeHead(response.status, Object.fromEntries(response.headers));

    if (response.body) {
      const reader = response.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    }
    res.end();
  } catch (err) {
    console.error('[web] request failed', url.pathname, err);
    if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('Internal error');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`web listening on http://${HOST}:${PORT}  (api: ${API_ORIGIN})`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
