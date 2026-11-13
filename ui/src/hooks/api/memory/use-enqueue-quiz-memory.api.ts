'use client';

import { useAmplifyApiClient, useSessionContext } from '@/providers';

export function useEnqueueQuizMemoryApi() {
  const client = useAmplifyApiClient();
  const { userAttributes } = useSessionContext();

  const enqueueQuizMemory = async (params: {
    quizUuid: string;
    quizAttemptUuid: string;
    score: number;
    total: number;
    topic: string;
    subject?: string;
    documentUuid?: string | null;
    spaceUuid?: string | null;
    occurredAt?: string;
    addedFrom?: 'quiz' | 'mock_exam';
  }) => {
    const userUuid = userAttributes?.userUuid;
    if (!userUuid) return;

    const occurredAt = params.occurredAt ?? new Date().toISOString();
    const payload = JSON.stringify({
      type: 'quiz_attempt',
      ownerUuid: userUuid,
      ...params,
      occurredAt,
      addedFrom: params.addedFrom ?? 'quiz',
      isBackfill: false,
    });

    await client.mutations.enqueueMemoryEvent({ userUuid, payload });
  };

  return { enqueueQuizMemory };
}
