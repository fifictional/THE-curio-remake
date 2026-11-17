/**
 * Grounding helpers for /aiChat.
 *
 * These decide what the model sees and what the Sources tab gets, so they are
 * pinned: numbered excerpts, one citation per document, best score first.
 */

import { describe, expect, it } from 'vitest';

import { buildContext, citationsFor } from './routes/ai-chat';
import type { DocumentChunkHit } from './qdrant';

const chunk = (over: Partial<DocumentChunkHit>): DocumentChunkHit => ({
  score: 0.5,
  documentUuid: 'doc-a',
  documentName: 'Notes',
  chunkIndex: 0,
  text: 'text',
  ...over,
});

describe('buildContext', () => {
  it('numbers the excerpts and names the document', () => {
    const context = buildContext([
      chunk({ documentName: 'Cell Biology', text: 'Mitochondria make ATP.' }),
      chunk({ documentUuid: 'doc-b', documentName: 'Chemistry', text: 'pH measures acidity.' }),
    ]);

    expect(context).toContain('[1] "Cell Biology"');
    expect(context).toContain('[2] "Chemistry"');
    expect(context).toContain('do not invent facts');
  });

  it('keeps the excerpts verbatim', () => {
    const context = buildContext([chunk({ text: 'Exact sentence, with punctuation.' })]);
    expect(context).toContain('Exact sentence, with punctuation.');
  });
});

describe('citationsFor', () => {
  it('dedupes by document and keeps the best score', () => {
    const citations = citationsFor([
      chunk({ documentUuid: 'doc-a', documentName: 'A', score: 0.4 }),
      chunk({ documentUuid: 'doc-a', documentName: 'A', score: 0.8, chunkIndex: 2 }),
      chunk({ documentUuid: 'doc-b', documentName: 'B', score: 0.6 }),
    ]);

    expect(citations).toEqual([
      { documentUuid: 'doc-a', documentName: 'A' },
      { documentUuid: 'doc-b', documentName: 'B' },
    ]);
  });

  it('returns nothing when no chunks were retrieved', () => {
    expect(citationsFor([])).toEqual([]);
  });
});
