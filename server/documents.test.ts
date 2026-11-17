/**
 * Document text extraction.
 *
 * Unit tests with real files on disk and a real (tiny) PDF, so the PDF path is
 * exercised rather than mocked: the point of the change is that pdf.js actually
 * reads the text layer.
 */

import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { extractPdfText, looksLikePdf } from './pdf';
import { extractText } from './routes/documents';

/**
 * A one-page PDF with one line of text, written by hand: no fixture binary in
 * the repo, no library needed to build it. Offsets in the xref table are
 * deliberately wrong — pdf.js rebuilds the table and still reads the page.
 */
function minimalPdf(text: string): Buffer {
  const stream = `BT /F1 24 Tf 20 100 Td (${text}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Contents 4 0 R ' +
      '/Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  objects.forEach((body, index) => {
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) pdf += '0000000000 00000 n \n';
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n0\n%%EOF\n`;

  return Buffer.from(pdf, 'latin1');
}

let root: string;
const files: Record<string, Buffer> = {
  'pdf/one.pdf': minimalPdf('Hello from a PDF'),
  'txt/notes.txt': Buffer.from('Photosynthesis converts light into chemical energy.'),
  'bin/image.png': Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01, 0x02]),
  'pdf/broken.pdf': Buffer.from('%PDF-1.4\nthis is not a pdf at all\n'),
};

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'curio-docs-'));
  process.env.FILES_DIR = root;
  for (const [key, buffer] of Object.entries(files)) {
    const path = join(root, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, buffer);
  }
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
  delete process.env.FILES_DIR;
});

describe('pdf text extraction', () => {
  it('recognises a PDF by its header, not its file name', () => {
    expect(looksLikePdf(files['pdf/one.pdf'])).toBe(true);
    expect(looksLikePdf(files['txt/notes.txt'])).toBe(false);
    expect(looksLikePdf(Buffer.from(''))).toBe(false);
  });

  it('reads the text layer of a real PDF', async () => {
    const text = await extractPdfText(files['pdf/one.pdf']);
    expect(text).toContain('Hello from a PDF');
  });

  it('returns null instead of throwing on a corrupt PDF', async () => {
    expect(await extractPdfText(files['pdf/broken.pdf'])).toBe(null);
  });
});

describe('extractText dispatch', () => {
  it('extracts a PDF by key', async () => {
    expect(await extractText('pdf/one.pdf')).toContain('Hello from a PDF');
  });

  it('extracts a text file', async () => {
    expect(await extractText('txt/notes.txt')).toContain('Photosynthesis');
  });

  it('refuses binary files rather than returning mojibake', async () => {
    expect(await extractText('bin/image.png')).toBe(null);
  });

  it('returns null for a missing object and for path traversal', async () => {
    expect(await extractText('pdf/missing.pdf')).toBe(null);
    expect(await extractText('../package.json')).toBe(null);
  });
});
