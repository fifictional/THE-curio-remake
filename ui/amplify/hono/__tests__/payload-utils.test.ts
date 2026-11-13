/**
 * Unit tests for `extractSpaceUserArgs` (P3-5 payload helper).
 */

import { describe, expect, it } from 'vitest';

import { extractSpaceUserArgs } from '../shared/payload-utils';

describe('extractSpaceUserArgs', () => {
  it('reads AppSync/direct-invoke flat body', () => {
    expect(
      extractSpaceUserArgs({ spaceUuid: 's1', userUuid: 'u1' }),
    ).toEqual({ spaceUuid: 's1', userUuid: 'u1' });
  });

  it('reads nested arguments object', () => {
    expect(
      extractSpaceUserArgs({
        arguments: { spaceUuid: 's2', userUuid: 'u2' },
      }),
    ).toEqual({ spaceUuid: 's2', userUuid: 'u2' });
  });

  it('prefers nested arguments over top-level', () => {
    expect(
      extractSpaceUserArgs({
        spaceUuid: 'top',
        userUuid: 'top-u',
        arguments: { spaceUuid: 'nested', userUuid: 'nested-u' },
      }),
    ).toEqual({ spaceUuid: 'nested', userUuid: 'nested-u' });
  });

  it('returns empty for invalid input', () => {
    expect(extractSpaceUserArgs(null)).toEqual({});
    expect(extractSpaceUserArgs('bad')).toEqual({});
  });
});
