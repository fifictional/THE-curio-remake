import { describe, expect, it } from 'vitest';
import {
  memoryTimestampsForCreate,
  memoryTimestampsForMerge,
} from '../resolve-event-time';

describe('memoryTimestampsForCreate', () => {
  const now = '2026-06-22T12:00:00.000Z';

  it('uses now for all event fields when occurredAt is omitted (live capture)', () => {
    const times = memoryTimestampsForCreate(undefined, now);
    expect(times).toEqual({
      firstSeenAt: now,
      lastReinforcedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  });

  it('uses source date for event fields when occurredAt is provided (backfill)', () => {
    const source = '2025-01-15T09:30:00.000Z';
    const times = memoryTimestampsForCreate(source, now);
    expect(times).toEqual({
      firstSeenAt: source,
      lastReinforcedAt: source,
      createdAt: source,
      updatedAt: now,
    });
  });
});

describe('memoryTimestampsForMerge', () => {
  const now = '2026-06-22T12:00:00.000Z';

  it('updates lastReinforcedAt to now on live reinforcement without occurredAt', () => {
    const existing = {
      firstSeenAt: '2026-01-01T00:00:00.000Z',
      lastReinforcedAt: '2026-01-01T00:00:00.000Z',
    };
    const times = memoryTimestampsForMerge(existing, undefined, now);
    expect(times.firstSeenAt).toBe('2026-01-01T00:00:00.000Z');
    expect(times.lastReinforcedAt).toBe(now);
    expect(times.updatedAt).toBe(now);
  });

  it('pulls firstSeenAt back when merging an older backfill event', () => {
    const existing = {
      firstSeenAt: '2026-06-22T12:00:00.000Z',
      lastReinforcedAt: '2026-06-22T12:00:00.000Z',
    };
    const historical = '2025-03-10T08:00:00.000Z';
    const times = memoryTimestampsForMerge(existing, historical, now);
    expect(times.firstSeenAt).toBe(historical);
    expect(times.lastReinforcedAt).toBe('2026-06-22T12:00:00.000Z');
  });

  it('advances lastReinforcedAt through chronological backfill merges', () => {
    const existing = {
      firstSeenAt: '2025-01-01T00:00:00.000Z',
      lastReinforcedAt: '2025-01-01T00:00:00.000Z',
    };
    const later = '2025-06-01T00:00:00.000Z';
    const times = memoryTimestampsForMerge(existing, later, now);
    expect(times.firstSeenAt).toBe('2025-01-01T00:00:00.000Z');
    expect(times.lastReinforcedAt).toBe(later);
  });
});
