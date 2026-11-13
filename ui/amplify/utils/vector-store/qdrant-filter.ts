import type { VectorFilter, MemoryScopeFilter, VectorPayload } from './types';

type QdrantCondition = Record<string, unknown>;

function term(key: string, value: string): QdrantCondition {
  return { key, match: { value } };
}

function terms(key: string, values: string[]): QdrantCondition {
  return { key, match: { any: values } };
}

function scopeClause(scope: MemoryScopeFilter): QdrantCondition {
  return {
    must: [term('scope', scope.scope), term('scopeId', scope.scopeId)],
  };
}

/** Map our filter model to a Qdrant filter object. */
export function toQdrantFilter(filter: VectorFilter): QdrantCondition | undefined {
  const must: QdrantCondition[] = [];

  if (filter.userUuid) {
    must.push(term('userUuid', filter.userUuid));
  }
  if (filter.spaceUuid) {
    must.push(term('spaceUuid', filter.spaceUuid));
  }
  if (filter.sourceType) {
    must.push(term('sourceType', filter.sourceType));
  }
  if (filter.memoryBlockUuid) {
    must.push(term('memoryBlockUuid', filter.memoryBlockUuid));
  }
  if (filter.blockType) {
    must.push(term('blockType', filter.blockType));
  }
  if (filter.documentUuid) {
    if (Array.isArray(filter.documentUuid)) {
      if (filter.documentUuid.length > 0) {
        must.push(terms('documentUuid', filter.documentUuid));
      }
    } else {
      must.push(term('documentUuid', filter.documentUuid));
    }
  }

  const nested: QdrantCondition[] = [];
  if (filter.memoryScopes && filter.memoryScopes.length > 0) {
    nested.push({
      should: filter.memoryScopes.map(scopeClause),
    });
  }

  if (must.length === 0 && nested.length === 0) {
    return undefined;
  }

  const result: QdrantCondition = {};
  if (must.length > 0) {
    result.must = must;
  }
  if (nested.length > 0) {
    result.must = [...(result.must as QdrantCondition[] | undefined ?? []), ...nested];
  }

  return result;
}

/**
 * Replace unpaired UTF-16 surrogates so JSON bodies stay valid for Qdrant.
 * OpenSearch chunk text occasionally contains lone surrogates that break upserts.
 */
export function sanitizeUtf16String(value: string): string {
  let out = '';
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        out += value[i] + value[i + 1];
        i += 1;
      } else {
        out += '\uFFFD';
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      out += '\uFFFD';
    } else {
      out += value[i];
    }
  }
  return out;
}

export function payloadToQdrant(payload: Partial<VectorPayload>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    out[key] = typeof value === 'string' ? sanitizeUtf16String(value) : value;
  }
  return out;
}
