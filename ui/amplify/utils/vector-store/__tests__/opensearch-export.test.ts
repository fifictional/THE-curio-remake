import { describe, expect, it } from 'vitest';
import {
  computeExportSliceCount,
  openSearchHitToVectorPoint,
} from '../opensearch-export';

describe('opensearch-export', () => {
  describe('computeExportSliceCount', () => {
    it('returns 1 for empty index', () => {
      expect(computeExportSliceCount(0)).toBe(1);
    });

    it('scales slices with document count', () => {
      expect(computeExportSliceCount(5000)).toBe(1);
      expect(computeExportSliceCount(5001)).toBe(2);
      expect(computeExportSliceCount(250_000)).toBe(50);
    });
  });

  describe('openSearchHitToVectorPoint', () => {
    it('maps OpenSearch hit to VectorPoint', () => {
      const point = openSearchHitToVectorPoint({
        _id: 'doc-chunk-1',
        _source: {
          chunkId: 'doc-chunk-1',
          userUuid: 'user-1',
          documentUuid: 'doc-1',
          chunkText: 'hello',
          embedding: [0.1, 0.2],
          sourceType: 'flashcard',
        },
      });

      expect(point).toEqual({
        id: 'doc-chunk-1',
        vector: [0.1, 0.2],
        payload: {
          userUuid: 'user-1',
          chunkId: 'doc-chunk-1',
          chunkText: 'hello',
          documentUuid: 'doc-1',
          sourceType: 'flashcard',
          spaceUuid: undefined,
          memoryBlockUuid: undefined,
          blockType: undefined,
          topic: undefined,
          scope: undefined,
          scopeId: undefined,
          createdAt: undefined,
        },
      });
    });

    it('returns null when embedding is missing', () => {
      expect(
        openSearchHitToVectorPoint({
          _id: 'x',
          _source: { chunkId: 'x' },
        }),
      ).toBeNull();
    });
  });
});
