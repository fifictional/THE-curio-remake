/**
 * Unit tests for formatResetTime (EOPRD-838).
 *
 * The function must always return a relative duration so the rendered chat
 * message cannot be misread across timezones or go stale after being persisted
 * into Message.content.
 */

import { describe, test, expect } from 'vitest';
import { formatResetTime } from '../format-reset-time';

const fixedNow = new Date('2026-05-20T15:00:00.000Z');
const at = (offsetMs: number) =>
  new Date(fixedNow.getTime() + offsetMs).toISOString();

describe('formatResetTime', () => {
  test('returns "soon" when resetAt is null', () => {
    expect(formatResetTime(null, fixedNow)).toBe('soon');
  });

  test('returns "shortly" when resetAt is in the past', () => {
    expect(formatResetTime(at(-60 * 1000), fixedNow)).toBe('shortly');
  });

  test('returns "shortly" when resetAt is exactly now', () => {
    expect(formatResetTime(at(0), fixedNow)).toBe('shortly');
  });

  test('returns "in 1 minute" for sub-minute remainder (ceils up)', () => {
    expect(formatResetTime(at(30 * 1000), fixedNow)).toBe('in 1 minute');
  });

  test('returns "in 1 minute" for exactly 1 minute', () => {
    expect(formatResetTime(at(60 * 1000), fixedNow)).toBe('in 1 minute');
  });

  test('returns "in N minutes" for sub-hour remainders', () => {
    expect(formatResetTime(at(30 * 60 * 1000), fixedNow)).toBe('in 30 minutes');
    expect(formatResetTime(at(59 * 60 * 1000), fixedNow)).toBe('in 59 minutes');
  });

  test('returns "in about 1 hour" at exactly 60 minutes', () => {
    expect(formatResetTime(at(60 * 60 * 1000), fixedNow)).toBe('in about 1 hour');
  });

  test('returns hours + minutes for multi-hour remainders', () => {
    expect(formatResetTime(at((2 * 60 + 15) * 60 * 1000), fixedNow)).toBe(
      'in about 2 hours and 15 minutes'
    );
  });

  test('drops the minutes clause on exact-hour multi-hour remainders', () => {
    expect(formatResetTime(at(3 * 60 * 60 * 1000), fixedNow)).toBe(
      'in about 3 hours'
    );
  });

  test('singularises the minutes clause when minutes === 1', () => {
    expect(formatResetTime(at((60 + 1) * 60 * 1000), fixedNow)).toBe(
      'in about 1 hour and 1 minute'
    );
  });

  test('is timezone-independent: same output regardless of resetAt timezone notation', () => {
    const offsetMs = 45 * 60 * 1000;
    const asUtc = at(offsetMs);
    const asLocal = new Date(fixedNow.getTime() + offsetMs)
      .toISOString()
      .replace('Z', '+00:00');
    expect(formatResetTime(asUtc, fixedNow)).toBe(
      formatResetTime(asLocal, fixedNow)
    );
  });
});
