/**
 * Datalab OCR — the scanned-PDF path.
 *
 * Text-layer PDFs are parsed locally (`server/pdf.ts`). A scan has no text layer,
 * so the pipeline asks Datalab (the service the old stack used) for markdown,
 * which then flows through the same summary + indexing steps.
 *
 * No key → `null`, and the document keeps the honest "no text layer, needs OCR"
 * message. The wire format is tolerant on purpose: Datalab answers either with
 * the result inline or with a `request_check_url` to poll, and both are handled.
 */

const API_URL = () => process.env.DATALAB_API_URL ?? 'https://api.datalab.to/api/v1/marker';
const API_KEY = () => process.env.DATALAB_API_KEY ?? '';
const POLL_MS = Number(process.env.DATALAB_POLL_MS ?? 3000);
const MAX_POLLS = Number(process.env.DATALAB_MAX_POLLS ?? 40);

export const datalabConfigured = () => Boolean(API_KEY());

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface DatalabResponse {
  success?: boolean;
  status?: string;
  markdown?: string;
  output?: string;
  text?: string;
  error?: string;
  request_check_url?: string;
}

/** Pulls markdown out of whichever shape the response used. */
function textOf(body: DatalabResponse): string | null {
  const value = body.markdown ?? body.output ?? body.text;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function ocrPdf(
  buffer: Uint8Array,
  fileName = 'document.pdf',
): Promise<string | null> {
  if (!datalabConfigured()) return null;

  try {
    const form = new FormData();
    // `Uint8Array<ArrayBufferLike>` is not a BlobPart under strict lib types.
    form.append('file', new Blob([buffer as unknown as ArrayBuffer], { type: 'application/pdf' }), fileName);
    form.append('output_format', 'markdown');

    const res = await fetch(API_URL(), {
      method: 'POST',
      headers: { 'X-Api-Key': API_KEY() },
      body: form,
    });

    if (!res.ok) {
      console.warn('[ocr] datalab answered', res.status);
      return null;
    }

    let body = (await res.json()) as DatalabResponse;

    // Either inline, or poll the check url until it reports a result.
    for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
      const inline = textOf(body);
      if (inline) return inline;

      if (!body.request_check_url) return null;
      if (attempt > 0) await sleep(POLL_MS);

      const poll = await fetch(body.request_check_url, {
        headers: { 'X-Api-Key': API_KEY() },
      });
      if (!poll.ok) return null;
      body = (await poll.json()) as DatalabResponse;

      if (body.status === 'failed' || body.error) return null;
    }

    return null;
  } catch (err) {
    console.warn('[ocr] datalab request failed:', (err as Error).message);
    return null;
  }
}
