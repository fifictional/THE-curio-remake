import { describe, expect, it } from 'vitest';
import { extractMemoryFromQuiz } from '../extractors/quiz-extractor';

describe('extractMemoryFromQuiz', () => {
  it('creates knowledge gap when score below 60%', () => {
    const candidates = extractMemoryFromQuiz({
      ownerUuid: 'user-1',
      quizUuid: 'quiz-1',
      quizAttemptUuid: 'attempt-1',
      score: 2,
      total: 10,
      topic: 'Mitosis',
    });
    expect(candidates).toHaveLength(1);
    expect(candidates[0].blockType).toBe('knowledge_gap');
  });

  it('creates mastered when 3 high scores on different days', () => {
    const candidates = extractMemoryFromQuiz({
      ownerUuid: 'user-1',
      quizUuid: 'quiz-1',
      quizAttemptUuid: 'attempt-4',
      score: 9,
      total: 10,
      topic: 'Photosynthesis',
      priorAttempts: [
        { scoreRatio: 0.9, createdAt: '2026-05-01T10:00:00Z' },
        { scoreRatio: 0.88, createdAt: '2026-05-03T10:00:00Z' },
      ],
    });
    expect(candidates.some((c) => c.blockType === 'mastered_topic')).toBe(true);
  });
});
