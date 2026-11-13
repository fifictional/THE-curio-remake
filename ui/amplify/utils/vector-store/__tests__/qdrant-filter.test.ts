import { describe, expect, it } from 'vitest';
import { payloadToQdrant, sanitizeUtf16String, toQdrantFilter } from '../qdrant-filter';

describe('sanitizeUtf16String', () => {
  it('replaces unpaired surrogates', () => {
    expect(sanitizeUtf16String('ok\uD800bad')).toBe('ok\uFFFDbad');
    expect(sanitizeUtf16String('ok\uDCFFbad')).toBe('ok\uFFFDbad');
  });

  it('keeps valid surrogate pairs', () => {
    expect(sanitizeUtf16String('emoji \uD83D\uDE00')).toBe('emoji \uD83D\uDE00');
  });
});

describe('payloadToQdrant', () => {
  it('sanitizes string payload fields', () => {
    expect(
      payloadToQdrant({
        userUuid: 'u1',
        chunkId: 'c1',
        chunkText: 'x\uD800y',
      }),
    ).toEqual({
      userUuid: 'u1',
      chunkId: 'c1',
      chunkText: 'x\uFFFDy',
    });
  });
});

describe('toQdrantFilter', () => {
  it('maps user and document filters', () => {
    expect(
      toQdrantFilter({
        userUuid: 'user-1',
        documentUuid: ['doc-a', 'doc-b'],
      }),
    ).toEqual({
      must: [
        { key: 'userUuid', match: { value: 'user-1' } },
        { key: 'documentUuid', match: { any: ['doc-a', 'doc-b'] } },
      ],
    });
  });

  it('maps memory scope OR filters', () => {
    expect(
      toQdrantFilter({
        userUuid: 'user-1',
        sourceType: 'memory_block',
        memoryScopes: [
          { scope: 'user', scopeId: 'user-1' },
          { scope: 'folder', scopeId: 'space-1' },
        ],
      }),
    ).toEqual({
      must: [
        { key: 'userUuid', match: { value: 'user-1' } },
        { key: 'sourceType', match: { value: 'memory_block' } },
        {
          should: [
            {
              must: [
                { key: 'scope', match: { value: 'user' } },
                { key: 'scopeId', match: { value: 'user-1' } },
              ],
            },
            {
              must: [
                { key: 'scope', match: { value: 'folder' } },
                { key: 'scopeId', match: { value: 'space-1' } },
              ],
            },
          ],
        },
      ],
    });
  });

  it('returns undefined for empty filter', () => {
    expect(toQdrantFilter({})).toBeUndefined();
  });
});
