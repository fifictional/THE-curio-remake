import type { Schema } from '@database-schema';
import { generateClient } from 'aws-amplify/data';
import type { MemoryQueueEvent } from './types';

type DataClient = ReturnType<typeof generateClient<Schema>>;

export function earlierIso(a: string, b: string): string {
  return a.localeCompare(b) <= 0 ? a : b;
}

export function laterIso(a: string, b: string): string {
  return a.localeCompare(b) >= 0 ? a : b;
}

export function memoryTimestampsForCreate(
  occurredAt: string | undefined,
  now: string,
): {
  firstSeenAt: string;
  lastReinforcedAt: string;
  createdAt: string;
  updatedAt: string;
} {
  const eventTime = occurredAt ?? now;
  return {
    firstSeenAt: eventTime,
    lastReinforcedAt: eventTime,
    createdAt: eventTime,
    updatedAt: now,
  };
}

export function memoryTimestampsForMerge(
  existing: { firstSeenAt?: string; lastReinforcedAt?: string },
  occurredAt: string | undefined,
  now: string,
): {
  firstSeenAt: string;
  lastReinforcedAt: string;
  updatedAt: string;
} {
  const eventTime = occurredAt ?? now;
  return {
    firstSeenAt: earlierIso(existing.firstSeenAt ?? eventTime, eventTime),
    lastReinforcedAt: laterIso(existing.lastReinforcedAt ?? eventTime, eventTime),
    updatedAt: now,
  };
}

/** Backfill missing occurredAt from the source record (in-flight SQS / older clients). */
export async function resolveEventOccurredAt(
  client: DataClient,
  event: MemoryQueueEvent,
): Promise<MemoryQueueEvent> {
  if (event.occurredAt) {
    return event;
  }

  if (event.type === 'chat_interaction') {
    const msg = await client.models.Message.get({ messageUuid: event.messageUuid });
    if (msg.data?.createdAt) {
      return { ...event, occurredAt: msg.data.createdAt };
    }
    return event;
  }

  const attempt = await client.models.QuizAttempt.get({
    quizAttemptUuid: event.quizAttemptUuid,
  });
  if (attempt.data?.createdAt) {
    return { ...event, occurredAt: attempt.data.createdAt };
  }

  const mockLog = await client.models.MockExamLog.get({
    mockExamLogUuid: event.quizAttemptUuid,
  });
  const mockTime = mockLog.data?.completedAt ?? mockLog.data?.createdAt;
  if (mockTime) {
    return { ...event, occurredAt: mockTime };
  }

  return event;
}
