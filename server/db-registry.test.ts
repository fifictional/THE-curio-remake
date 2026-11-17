/**
 * The bridge's model list, pinned.
 *
 * `/db` is the widest surface in the app, so adding a model to it should be a
 * decision someone makes on purpose — not something that slips in with a schema
 * change. This test fails on any difference, in either direction.
 */

import { describe, expect, it } from 'vitest';

import { registryModels } from './routes/db';

/**
 * Deliberate exclusions, for the record:
 *   - `users` / sessions / accounts / verifications → covered by `UserProfile`
 *   - dropped features (practice tests, learning profile, SAT prep): MockExam,
 *     MockExamLog, ExamPaper, ExamPaperQuestion, ExtractedQuestion,
 *     QuestionExtractJob, QuestionGenerationJob, SATMiniExamLog, FlashcardGame,
 *     UserLearningProfileHistory
 *   - owner-only (PII / internal state): FutureUser, BatchProcess
 *   - pipeline output nobody reads from the app: DocumentVisionOutput
 */
const EXPECTED = [
  'AppSettings',
  'Chat',
  'ChatCitation',
  'DatalabRequest',
  'Document',
  'DocumentSection',
  'DocumentSummary',
  'Flashcard',
  'FlashcardDeck',
  'Message',
  'Metadata',
  'MockDocument',
  'Partnership',
  'Question',
  'Quiz',
  'QuizAttempt',
  'QuizQuestion',
  'Space',
  'SpaceUsers',
  'Task',
  'UserActionLog',
  'UserProfile',
  'UserRequest',
];

describe('/db registry', () => {
  it('serves exactly the models we decided to expose', () => {
    expect([...registryModels].sort()).toEqual([...EXPECTED].sort());
  });

  it('does not expose the dropped or owner-only models', () => {
    for (const name of [
      'MockExam',
      'MockExamLog',
      'ExamPaper',
      'ExtractedQuestion',
      'SATMiniExamLog',
      'FlashcardGame',
      'UserLearningProfileHistory',
      'FutureUser',
      'BatchProcess',
    ]) {
      expect(registryModels).not.toContain(name);
    }
  });
});
