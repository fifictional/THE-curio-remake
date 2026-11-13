import type { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import type { Schema } from '@database-schema';
import { createAIClient } from '@ai-client';
import { INTENT } from '@ai-intents/types';
import { TIER } from '@ai-intents/tier';
import type { UserContentItem } from '@ai-providers/types';
import type { MemoryQueueEvent } from './types';
import {
  ADDED_FROM_CHAT,
  ADDED_FROM_QUIZ,
  QUIZ_MASTERED_SCORE_RATIO,
} from './constants';
import { MemoryService } from './memory-service';
import {
  buildReflectionUserContent,
  parseLlmReflectionResponse,
  reflectionContextFromEvent,
  MEMORY_REFLECTION_PROMPT,
} from './extractors/llm-reflection-extractor';

type DataClient = ReturnType<
  typeof import('aws-amplify/api').generateClient<Schema>
>;

export async function runAgentReflection(params: {
  client: DataClient;
  event: MemoryQueueEvent;
  cloudwatchClient: CloudWatchClient;
  priorQuizAttempts?: Array<{ scoreRatio: number; createdAt: string }>;
}): Promise<{ stored: number; agentFailed?: boolean }> {
  const { client, event, cloudwatchClient, priorQuizAttempts } = params;
  const content = buildReflectionUserContent(event, { priorQuizAttempts });
  if (!content) {
    return { stored: 0 };
  }

  const aiClient = createAIClient({
    userUuid: event.ownerUuid,
    saveTokenData: async () => {},
    cloudwatchClient,
  });

  const userContent: UserContentItem[] = [
    { mimeType: 'text/plain', content },
  ];

  const result = await aiClient.call({
    intent: INTENT.MEMORY_REFLECTION,
    userTier: TIER.FREE,
    prompt: MEMORY_REFLECTION_PROMPT,
    userContent,
    category: 'extraction',
    feature: 'reflection',
    temperature: 0.2,
  });

  if (result.error || !result.responseText) {
    console.warn('[memory-reflection] agent call failed', result.error);
    return { stored: 0, agentFailed: true };
  }

  console.info('[memory-reflection] agent raw response', {
    type: event.type,
    ownerUuid: event.ownerUuid,
    responseText: result.responseText.slice(0, 800),
  });

  const ctx = reflectionContextFromEvent(event);
  let candidates = parseLlmReflectionResponse(result.responseText, ctx);

  console.info('[memory-reflection] parsed candidates', {
    type: event.type,
    ownerUuid: event.ownerUuid,
    parsedCandidateCount: candidates.length,
    topics: candidates.map((c) => `${c.blockType}:${c.topic}`),
  });

  if (event.type === 'quiz_attempt') {
    const ratio = event.total > 0 ? event.score / event.total : 0;
    candidates = candidates.map((c) => ({
      ...c,
      sources: [event.quizAttemptUuid],
      payload: {
        ...c.payload,
        accuracy: ratio,
        topic: c.topic || event.topic,
        subject: c.subject ?? event.subject,
        documentUuid: event.documentUuid ?? c.documentUuid,
      },
    }));
  }

  if (event.occurredAt) {
    candidates = candidates.map((c) => ({ ...c, occurredAt: event.occurredAt }));
  }

  const addedFrom =
    event.addedFrom ??
    (event.type === 'chat_interaction' ? ADDED_FROM_CHAT : ADDED_FROM_QUIZ);
  const isBackfill = event.isBackfill ?? false;
  candidates = candidates.map((c) => ({ ...c, addedFrom, isBackfill }));

  const memory = new MemoryService(client);

  // A strong score disproves any previously recorded gap on this topic, even
  // when it isn't yet enough evidence for the agent to record mastery.
  if (event.type === 'quiz_attempt' && event.total > 0) {
    const ratio = event.score / event.total;
    if (ratio >= QUIZ_MASTERED_SCORE_RATIO) {
      const resolved = await memory.resolveGapsForHighScore(
        event.ownerUuid,
        event.topic
      );
      if (resolved > 0) {
        console.info('[memory-reflection] resolved gaps after high score', {
          ownerUuid: event.ownerUuid,
          topic: event.topic,
          resolved,
        });
      }
    }
  }

  if (candidates.length === 0) {
    console.info('[memory-reflection] agent chose not to store', {
      type: event.type,
      ownerUuid: event.ownerUuid,
    });
    return { stored: 0 };
  }
  let stored = 0;
  for (const c of candidates) {
    const outcome = await memory.upsertCandidate(c);
    if (outcome.decision === 'created' || outcome.decision === 'merged') {
      stored += 1;
      console.info('[memory-reflection] upsert', {
        type: event.type,
        topic: c.topic,
        blockType: c.blockType,
        decision: outcome.decision,
        memoryBlockUuid: outcome.memoryBlockUuid,
      });
    } else {
      console.warn('[memory-reflection] upsert skipped', {
        type: event.type,
        topic: c.topic,
        blockType: c.blockType,
        decision: outcome.decision,
      });
    }
  }
  return { stored };
}
