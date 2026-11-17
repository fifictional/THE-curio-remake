/**
 * Chunking rules for retrieval.
 *
 * Pure functions, but worth pinning: the chunk boundary decides what a citation
 * can quote, and a silent regression here changes answer quality, not shape.
 */

import { describe, expect, it } from 'vitest';

import { CHUNK_OVERLAP, CHUNK_SIZE, chunkId, chunkText } from './document-index';

describe('chunkText', () => {
  it('keeps short text as one chunk', () => {
    expect(chunkText('Photosynthesis converts light into sugar.')).toEqual([
      'Photosynthesis converts light into sugar.',
    ]);
  });

  it('returns nothing for empty or whitespace-only text', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   \n\n  ')).toEqual([]);
  });

  it('collapses whitespace before splitting', () => {
    expect(chunkText('a\n\n  b\tc')).toEqual(['a b c']);
  });

  it('splits long text and overlaps the boundary', () => {
    const sentence = 'The mitochondrion is the powerhouse of the cell. ';
    const text = sentence.repeat(60);
    const chunks = chunkText(text);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(CHUNK_SIZE);

    // The join of the chunks covers everything: no text is dropped.
    const rebuilt = chunks.join(' ');
    expect(rebuilt.length).toBeGreaterThanOrEqual(text.trim().length);

    // Each boundary shares text with the previous chunk (the overlap).
    for (let i = 1; i < chunks.length; i += 1) {
      const tail = chunks[i - 1].slice(-Math.min(CHUNK_OVERLAP, chunks[i - 1].length));
      const head = chunks[i].slice(0, CHUNK_OVERLAP);
      expect(tail.slice(-40), `chunk ${i} overlap`).toContain(head.slice(0, 20).trim().split(' ')[0]);
    }
  });

  it('prefers a sentence boundary over a hard cut', () => {
    const text = `${'word '.repeat(200)}End here. ${'tail '.repeat(200)}`;
    const chunks = chunkText(text);
    expect(chunks[0].endsWith('.') || chunks[0].endsWith('here.')).toBe(true);
  });
});

describe('chunkId', () => {
  it('is deterministic per document + index, so re-indexing overwrites', () => {
    const a = chunkId('11111111-1111-4111-8111-111111111111', 0);
    const b = chunkId('11111111-1111-4111-8111-111111111111', 0);
    const c = chunkId('11111111-1111-4111-8111-111111111111', 1);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
