/**
 * Local object storage — the S3 replacement for the legacy UI.
 *
 *   POST /files?key=<path>   raw bytes in, writes .local/files/<key>
 *   GET  /files?key=<path>   raw bytes out
 *
 * Deliberately dumb: no presigning, no multipart, no ACLs. The database row
 * remains the source of truth for who may read a document; this endpoint is
 * only reachable through the app.
 */

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';

import type { Context } from 'hono';

import type { HonoEnv } from '../types';

const ROOT = process.env.FILES_DIR ?? '.local/files';

/** Reject traversal: the key must stay inside ROOT. */
function resolveKey(key: string): string | null {
  const cleaned = key.replace(/^\/+/, '');
  const full = normalize(join(ROOT, cleaned));
  if (!full.startsWith(normalize(ROOT))) return null;
  return full;
}

export async function uploadFile(c: Context<HonoEnv>): Promise<Response> {
  const identity = c.var.identity as { sub: string } | null;
  if (!identity) return c.json({ error: 'Not signed in' }, 401);

  const key = c.req.query('key');
  if (!key) return c.json({ error: 'key query parameter is required' }, 400);

  const path = resolveKey(key);
  if (!path) return c.json({ error: 'Invalid key' }, 400);

  const bytes = new Uint8Array(await c.req.arrayBuffer());
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);

  return c.json({ key, size: bytes.byteLength });
}

export async function downloadFile(c: Context<HonoEnv>): Promise<Response> {
  const identity = c.var.identity as { sub: string } | null;
  if (!identity) return c.json({ error: 'Not signed in' }, 401);

  const key = c.req.query('key');
  if (!key) return c.json({ error: 'key query parameter is required' }, 400);

  const path = resolveKey(key);
  if (!path) return c.json({ error: 'Invalid key' }, 400);

  try {
    const info = await stat(path);
    if (!info.isFile()) return c.json({ error: 'Not a file' }, 404);
    const body = await readFile(path);
    return c.body(new Uint8Array(body), 200, {
      'content-type': 'application/octet-stream',
      'content-length': String(info.size),
    });
  } catch {
    return c.json({ error: 'Not found' }, 404);
  }
}
