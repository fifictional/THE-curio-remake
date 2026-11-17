/**
 * Document creation + the polling worker.
 *
 * The old flow was: S3 upload -> Document row -> Task row -> DynamoDB stream ->
 * SQS -> ECS dispatcher -> Step Functions (10 steps, including a multi-minute
 * Datalab wait). Streams cannot fire locally, so the trigger is a poller and the
 * pipeline is a plain function.
 *
 * This is the *shape* of that pipeline, not the pipeline: it extracts text from
 * the uploaded file (the PDF text layer via `server/pdf.ts`; Datalab's layout AI
 * is not replaced), and either asks OpenAI for a summary (when a key is present)
 * or records a placeholder. Summaries, flashcards and quizzes can be layered on
 * without changing the trigger.
 */

import { readFile } from 'node:fs/promises';
import { join, normalize } from 'node:path';

import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import type { Context } from 'hono';
import { z } from 'zod';

import { chat, hasAiKey } from '../ai';
import { ownerDb } from '../db/owner-client';
import { documentSummaries, documents, spaces, tasks } from '../db/schema';
import { getValidatedBody, validateBody } from '../middleware/validate';
import { extractPdfText, looksLikePdf, MAX_TEXT_CHARS } from '../pdf';
import type { HonoEnv } from '../types';

/** Read per call, not at import: tests point it at a temp directory. */
const filesRoot = () => process.env.FILES_DIR ?? '.local/files';

const CreateDocumentArgs = z.object({
  documentUuid: z.string().uuid().optional(),
  originalKey: z.string().min(1),
  fileName: z.string().min(1),
  type: z.string().min(1),
  spaceUuid: z.string().uuid().nullish(),
});

export const createDocumentValidate = validateBody(CreateDocumentArgs);

/**
 * POST /documents — create the Document row and a PENDING Task.
 * The worker picks the task up; nothing here waits for processing.
 */
export async function createDocument(c: Context<HonoEnv>): Promise<Response> {
  const identity = c.var.identity as { sub: string } | null;
  if (!identity) return c.json({ success: false, error: 'Not signed in' }, 401);

  const input = getValidatedBody<typeof CreateDocumentArgs>(c);
  const documentUuid = input.documentUuid ?? crypto.randomUUID();

  /*
   * The key is what /files authorises against, so accepting any string here
   * would let a caller mint a document row for someone else's object and then
   * read it: `ownsKey` trusts a documents row the caller owns. Same prefix rule
   * as files.ts — the owner is in the path.
   */
  const owned = `student-documents/${identity.sub}/`;
  if (!input.originalKey.startsWith(owned) && !input.originalKey.startsWith('yt-transcripts/')) {
    return c.json({ success: false, error: 'Not found' }, 404);
  }

  // Ownership of the target folder, if one was given.
  let spaceUuid: string | null = input.spaceUuid ?? null;
  if (spaceUuid) {
    const [space] = await ownerDb
      .select()
      .from(spaces)
      .where(and(eq(spaces.spaceUuid, spaceUuid), eq(spaces.userUuid, identity.sub)))
      .limit(1);
    if (!space) spaceUuid = null;
  }

  const [document] = await ownerDb
    .insert(documents)
    .values({
      documentUuid,
      userUuid: identity.sub,
      spaceUuid,
      key: input.originalKey,
      originalKey: input.originalKey,
      fileName: input.fileName,
      type: input.type,
    })
    .returning();

  const [task] = await ownerDb
    .insert(tasks)
    .values({
      taskUuid: crypto.randomUUID(),
      documentUuid,
      userUuid: identity.sub,
      status: 'PENDING',
      type: 'DOCUMENT_PROCESSING',
      args: { fileName: input.fileName },
      progress: 0,
    })
    .returning();

  return c.json({ success: true, document, task });
}

/**
 * Text of the stored object, whatever it is.
 *
 * PDFs go through the text-layer extractor; anything that is not text (images,
 * office documents) is reported as unreadable rather than summarised from
 * mojibake. `null` is a normal answer, not an error.
 */
export async function extractText(key: string): Promise<string | null> {
  const root = filesRoot();
  const path = normalize(join(root, key.replace(/^\/+/, '')));
  if (!path.startsWith(normalize(root))) return null;

  try {
    const buffer = await readFile(path);

    if (looksLikePdf(buffer)) return extractPdfText(buffer);

    if (buffer.byteLength > 2_000_000) return null;
    const text = buffer.toString('utf8');
    // Heuristic: reject binary files by their printable-character ratio.
    const printable = text.replace(/[^\x09\x0a\x0d\x20-\x7e]/g, '');
    if (printable.length < text.length * 0.9) return null;
    return text.slice(0, MAX_TEXT_CHARS);
  } catch {
    return null;
  }
}

const WORKER_INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS ?? 5000);

/**
 * One pass: claim PENDING tasks, process them, write a summary, mark done.
 * Runs as the owner connection because it acts on behalf of no single request.
 */
export async function processPendingTasksOnce(): Promise<{ processed: number }> {
  // Only document-bearing work. A migrated CHAT task has no document and used
  // to fill the batch forever: it was skipped and left PENDING, so the same
  // three rows were claimed on every pass.
  const pending = await ownerDb
    .select()
    .from(tasks)
    .where(and(inArray(tasks.status, ['PENDING']), isNotNull(tasks.documentUuid)))
    .limit(5);

  let processed = 0;

  for (const task of pending) {
    if (!task.documentUuid) continue;

    await ownerDb
      .update(tasks)
      .set({ status: 'PROCESSING', progress: 10, updatedAt: new Date() })
      .where(eq(tasks.taskUuid, task.taskUuid));

    const [document] = await ownerDb
      .select()
      .from(documents)
      .where(eq(documents.documentUuid, task.documentUuid))
      .limit(1);

    try {
      const text = document ? await extractText(document.key) : null;

      let summary: string;
      let title: string;

      if (text && hasAiKey()) {
        const reply = await chat([
          {
            role: 'system',
            content:
              'Summarise the document in 3 sentences, then list 3 key concepts on separate lines prefixed with "- ".',
          },
          { role: 'user', content: text },
        ]);
        summary = reply;
        title = document?.fileName ?? 'Document';
      } else {
        title = document?.fileName ?? 'Document';
        summary = text
          ? `Local extractive summary of “${title}”. ${text.slice(0, 400)}`
          : `“${title}” was uploaded and stored locally. Text extraction is not available for this file type yet, so no summary was generated.`;
      }

      if (document) {
        await ownerDb.insert(documentSummaries).values({
          documentSummaryUuid: crypto.randomUUID(),
          documentUuid: document.documentUuid,
          title,
          summary,
          tags: [],
          keyConcepts: [],
          status: 'completed',
        });
      }

      await ownerDb
        .update(tasks)
        .set({ status: 'COMPLETED', progress: 100, result: 'summary', updatedAt: new Date() })
        .where(eq(tasks.taskUuid, task.taskUuid));

      processed += 1;
    } catch (err) {
      await ownerDb
        .update(tasks)
        .set({
          status: 'FAILED',
          error: (err as Error).message.slice(0, 500),
          updatedAt: new Date(),
        })
        .where(eq(tasks.taskUuid, task.taskUuid));
    }
  }

  return { processed };
}

/** Start the poller. Called from index.ts when a database is configured. */
export function startWorker(): void {
  if (process.env.WORKER_ENABLED === '0') return;

  const tick = async () => {
    try {
      const { processed } = await processPendingTasksOnce();
      if (processed > 0) console.log(`[worker] processed ${processed} task(s)`);
    } catch (err) {
      console.warn('[worker] pass failed:', (err as Error).message);
    } finally {
      setTimeout(tick, WORKER_INTERVAL_MS);
    }
  };

  console.log(`  worker:     polling every ${WORKER_INTERVAL_MS}ms`);
  void tick();
}
