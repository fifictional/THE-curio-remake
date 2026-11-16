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

import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';

import { and, eq } from 'drizzle-orm';

import { asUser } from '../db/scope';
import { documents } from '../db/schema';
import { dirname, join, normalize } from 'node:path';

import type { Context } from 'hono';

import type { HonoEnv } from '../types';

const ROOT = process.env.FILES_DIR ?? '.local/files';
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 50 * 1024 * 1024);

/** Reject traversal: the key must stay inside ROOT. */
function resolveKey(key: string): string | null {
  const cleaned = key.replace(/^\/+/, '');
  const full = normalize(join(ROOT, cleaned));
  if (!full.startsWith(normalize(ROOT))) return null;
  return full;
}

/**
 * Authorisation for an object key.
 *
 * Dev storage keys embed the owner (`student-documents/<ownerUuid>/…`), so the
 * prefix is the cheapest correct check. Anything else must be a document row the
 * caller owns. Without this, any signed-in user could read another user's files
 * just by knowing (or guessing) a key — the path-traversal guard alone only kept
 * them inside the directory.
 */
async function ownsKey(userId: string, key: string): Promise<boolean> {
  const cleaned = key.replace(/^\/+/, '');
  if (cleaned.startsWith(`student-documents/${userId}/`)) return true;
  if (cleaned.startsWith('yt-transcripts/')) return true; // shared, public metadata

  const rows = await asUser(userId, async (db) =>
    db
      .select({ documentUuid: documents.documentUuid })
      .from(documents)
      .where(and(eq(documents.key, cleaned), eq(documents.userUuid, userId)))
      .limit(1),
  );
  return rows.length > 0;
}

export async function uploadFile(c: Context<HonoEnv>): Promise<Response> {
  const identity = c.var.identity as { sub: string } | null;
  if (!identity) return c.json({ error: 'Not signed in' }, 401);

  const key = c.req.query('key');
  if (!key) return c.json({ error: 'key query parameter is required' }, 400);

  const path = resolveKey(key);
  if (!path) return c.json({ error: 'Invalid key' }, 400);
  if (!(await ownsKey(identity.sub, key))) return c.json({ error: 'Not found' }, 404);

  const bytes = new Uint8Array(await c.req.arrayBuffer());
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return c.json({ error: `File too large (max ${MAX_UPLOAD_BYTES} bytes)` }, 413);
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);

  return c.json({ key, size: bytes.byteLength });
}

export async function deleteFile(c: Context<HonoEnv>): Promise<Response> {
  const identity = c.var.identity as { sub: string } | null;
  if (!identity) return c.json({ error: 'Not signed in' }, 401);

  const key = c.req.query('key');
  if (!key) return c.json({ error: 'key query parameter is required' }, 400);

  const path = resolveKey(key);
  if (!path) return c.json({ error: 'Invalid key' }, 400);
  if (!(await ownsKey(identity.sub, key))) return c.json({ error: 'Not found' }, 404);

  await rm(path, { force: true });
  return c.json({ key, deleted: true });
}

export async function downloadFile(c: Context<HonoEnv>): Promise<Response> {
  const identity = c.var.identity as { sub: string } | null;
  if (!identity) return c.json({ error: 'Not signed in' }, 401);

  const key = c.req.query('key');
  if (!key) return c.json({ error: 'key query parameter is required' }, 400);

  const path = resolveKey(key);
  if (!path) return c.json({ error: 'Invalid key' }, 400);
  if (!(await ownsKey(identity.sub, key))) return c.json({ error: 'Not found' }, 404);

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
