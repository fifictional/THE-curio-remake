/**
 * PDF text extraction — the S3 + Datalab replacement, minus the layout AI.
 *
 * Datalab (the old pipeline's step 1) returned markdown with page/bbox data for
 * every block. That is a paid service; this is the honest local version: pull
 * the text layer out of the PDF. Scans have no text layer, so they still produce
 * nothing — that is the boundary where Datalab (or OCR) would slot in.
 *
 * `unpdf` is pdf.js without the DOM: pure JS, no native build, no API key.
 */

import { extractText as pdfText, getDocumentProxy } from 'unpdf';

/** Truncation point for the model prompt. A 20-page policy PDF is ~35k chars. */
export const MAX_TEXT_CHARS = Number(process.env.MAX_TEXT_CHARS ?? 20_000);

/** Every PDF starts with this; cheaper than trusting the file name. */
export function looksLikePdf(buffer: Uint8Array): boolean {
  return buffer.subarray(0, 5).toString() === '%PDF-';
}

/**
 * Text of all pages, whitespace-collapsed and capped. `null` means "no usable
 * text" — a scan, a corrupt file, or an encrypted PDF — and the caller decides
 * what to tell the user.
 */
export async function extractPdfText(buffer: Uint8Array): Promise<string | null> {
  try {
    // verbosity 0: pdf.js warns about font quirks ("TT: undefined function: 21")
    // on perfectly readable PDFs, and the worker would log one per document.
    const pdf = await getDocumentProxy(buffer, { verbosity: 0 });
    const { text } = await pdfText(pdf, { mergePages: true });
    // Postgres text cannot hold NUL bytes, and pdf.js happily produces them for
    // some embedded fonts (`\u0000` inside Devanagari glyph maps, for example).
    // Strip control characters here: they would poison the summary insert, the
    // chunk insert and the FTS index alike.
    const flat = String(text ?? '')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return flat ? flat.slice(0, MAX_TEXT_CHARS) : null;
  } catch {
    return null;
  }
}
