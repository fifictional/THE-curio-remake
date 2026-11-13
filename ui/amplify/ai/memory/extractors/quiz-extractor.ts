import type { MemoryCandidateInput } from '../types';
import {
  BLOCK_TYPE_KNOWLEDGE_GAP,
  BLOCK_TYPE_MASTERED_TOPIC,
  QUIZ_GAP_SCORE_RATIO,
  QUIZ_MASTERED_MIN_ATTEMPTS,
  QUIZ_MASTERED_SCORE_RATIO,
} from '../constants';

export interface QuizMemoryInput {
  ownerUuid: string;
  quizUuid: string;
  quizAttemptUuid: string;
  score: number;
  total: number;
  topic: string;
  subject?: string;
  documentUuid?: string | null;
  spaceUuid?: string | null;
  documentName?: string;
  /** Prior attempts for same topic (score ratio 0-1, ISO dates) */
  priorAttempts?: Array<{ scoreRatio: number; createdAt: string }>;
  /** ISO timestamp of this attempt (defaults to now for live quizzes). */
  occurredAt?: string;
}

export function extractMemoryFromQuiz(
  input: QuizMemoryInput
): MemoryCandidateInput[] {
  const candidates: MemoryCandidateInput[] = [];
  if (input.total <= 0) return candidates;

  const ratio = input.score / input.total;
  const scope = input.spaceUuid ? 'folder' : 'user';
  const scopeId = input.spaceUuid ?? input.ownerUuid;
  const eventTime = input.occurredAt ?? new Date().toISOString();

  if (ratio < QUIZ_GAP_SCORE_RATIO) {
    candidates.push({
      ownerUuid: input.ownerUuid,
      scope,
      scopeId,
      blockType: BLOCK_TYPE_KNOWLEDGE_GAP,
      topic: input.topic,
      subject: input.subject,
      documentUuid: input.documentUuid ?? undefined,
      confidence: 0.85,
      sources: [input.quizAttemptUuid],
      occurredAt: eventTime,
      payload: {
        topic: input.topic,
        subject: input.subject,
        documentUuid: input.documentUuid ?? undefined,
        documentName: input.documentName,
        askedCount: 1,
        evidence: 'quiz_below_60',
        description: `Scored ${input.score}/${input.total} on a quiz for this topic.`,
      },
    });
    return candidates;
  }

  const allAttempts = [
    ...(input.priorAttempts ?? []),
    { scoreRatio: ratio, createdAt: eventTime },
  ];
  const highDays = new Set<string>();
  for (const a of allAttempts) {
    if (a.scoreRatio >= QUIZ_MASTERED_SCORE_RATIO) {
      highDays.add(a.createdAt.slice(0, 10));
    }
  }

  if (highDays.size >= QUIZ_MASTERED_MIN_ATTEMPTS) {
    candidates.push({
      ownerUuid: input.ownerUuid,
      scope,
      scopeId,
      blockType: BLOCK_TYPE_MASTERED_TOPIC,
      topic: input.topic,
      subject: input.subject,
      documentUuid: input.documentUuid ?? undefined,
      confidence: 0.9,
      sources: [input.quizAttemptUuid],
      occurredAt: eventTime,
      payload: {
        topic: input.topic,
        subject: input.subject,
        materials: input.documentUuid ? [input.documentUuid] : [],
        confirmedAt: eventTime,
        accuracy: ratio,
        evidence: 'quiz_mastered',
        description: `Scored ${Math.round(ratio * 100)}% or higher across ${highDays.size} different days.`,
      },
    });
  }

  return candidates;
}
