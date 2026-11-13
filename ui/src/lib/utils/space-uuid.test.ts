import { describe, expect, it } from 'vitest';
import { parseOptionalSpaceUuid } from './space-uuid';

describe('parseOptionalSpaceUuid', () => {
  it('returns null for undefined, null, empty, and stringified undefined/null', () => {
    expect(parseOptionalSpaceUuid(undefined)).toBeNull();
    expect(parseOptionalSpaceUuid(null)).toBeNull();
    expect(parseOptionalSpaceUuid('')).toBeNull();
    expect(parseOptionalSpaceUuid('undefined')).toBeNull();
    expect(parseOptionalSpaceUuid('null')).toBeNull();
    expect(parseOptionalSpaceUuid('  undefined  ')).toBeNull();
  });

  it('returns trimmed uuid string when valid', () => {
    expect(parseOptionalSpaceUuid('  abc-123  ')).toBe('abc-123');
  });
});
