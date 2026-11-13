/**
 * SAT MINI Question Selection Logic
 * 
 * This module handles the selection of questions for SAT MINI exams,
 * including both initial modules and adaptive modules based on performance.
 */

interface ExtractedQuestion {
  extractedQuestionUuid: string;
  questionContent: string;
  questionOptions: string[];
  correctAnswer: string;
  hint?: string;
  answerExplanations?: string[];
  questionReference?: {
    referenceType?: 'none' | 'image' | 'graph' | 'chart' | 'table' | 'passage';
    page: number;
    boundingBox: number[];
    s3Key?: string;
    text?: string;
  };
  concept?: string;
  subtopic?: string;
  difficulty?: string;
  module: string;
}

interface QuestionSelectionCriteria {
  module: 'Reading and Writing' | 'Math';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  count: number;
}

interface SATMiniQuestion {
  questionId: string;
  questionContent: string;
  options: string[];
  correctAnswer: number;
  hint?: string;
  answerExplanations?: string[];
  questionReference?: Array<{
    referenceType: string;
    externalKey?: string;
    text?: string;
  }>;
  concept: string;
  subtopic: string;
  difficulty?: string;
  givenAnswer?: number | null;
}

/**
 * Helper function to convert letter answer (A, B, C, D) to index (0, 1, 2, 3)
 */
function answerLetterToIndex(letter: string | null | undefined): number {
  if (!letter) return 0;
  const upperLetter = letter.toUpperCase();
  return Math.max(0, upperLetter.charCodeAt(0) - 'A'.charCodeAt(0));
}

/**
 * Get question selection criteria for initial modules (modules 1 & 2)
 * Module 1: Reading & Writing (2 easy, 1 medium)
 * Module 2: Math (2 easy, 1 medium)
 */
export function getInitialModuleCriteria(): QuestionSelectionCriteria[] {
  return [
    // Reading & Writing
    { module: 'Reading and Writing', difficulty: 'EASY', count: 2 },
    { module: 'Reading and Writing', difficulty: 'MEDIUM', count: 1 },
    // Math
    { module: 'Math', difficulty: 'EASY', count: 2 },
    { module: 'Math', difficulty: 'MEDIUM', count: 1 },
  ];
}

/**
 * Get question selection criteria for adaptive modules (modules 3 & 4)
 * Based on performance in modules 1 & 2
 * 
 * @param accuracy - Percentage of correct answers (0-100)
 * @returns Array of question selection criteria
 */
export function getAdaptiveModuleCriteria(accuracy: number): QuestionSelectionCriteria[] {
  const isEasyMedium = accuracy < 67;

  if (isEasyMedium) {
    // Easy-Medium: 1 easy, 2 medium per subject
    return [
      // Reading & Writing
      { module: 'Reading and Writing', difficulty: 'EASY', count: 1 },
      { module: 'Reading and Writing', difficulty: 'MEDIUM', count: 2 },
      // Math
      { module: 'Math', difficulty: 'EASY', count: 1 },
      { module: 'Math', difficulty: 'MEDIUM', count: 2 },
    ];
  } else {
    // Medium-Hard: 2 medium, 1 hard per subject
    return [
      // Reading & Writing
      { module: 'Reading and Writing', difficulty: 'MEDIUM', count: 2 },
      { module: 'Reading and Writing', difficulty: 'HARD', count: 1 },
      // Math
      { module: 'Math', difficulty: 'MEDIUM', count: 2 },
      { module: 'Math', difficulty: 'HARD', count: 1 },
    ];
  }
}

/**
 * Select questions based on criteria, excluding already answered questions
 * 
 * @param allQuestions - Pool of all available questions
 * @param criteria - Selection criteria (module, difficulty, count)
 * @param excludeQuestionIds - Set of question IDs to exclude
 * @returns Selected questions
 */
export function selectQuestions(
  allQuestions: ExtractedQuestion[],
  criteria: QuestionSelectionCriteria[],
  excludeQuestionIds: Set<string>
): ExtractedQuestion[] {
  const selected: ExtractedQuestion[] = [];

  for (const criterion of criteria) {
    // Filter questions by module and difficulty
    const candidates = allQuestions.filter(
      q =>
        q.module === criterion.module &&
        q.difficulty === criterion.difficulty &&
        !excludeQuestionIds.has(q.extractedQuestionUuid)
    );

    // Randomly select the required count
    const shuffled = candidates.sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, criterion.count);

    if (picked.length < criterion.count) {
      throw new Error(
        `Not enough questions available for ${criterion.module} - ${criterion.difficulty}. ` +
        `Needed: ${criterion.count}, Found: ${picked.length}`
      );
    }

    selected.push(...picked);
  }

  return selected;
}

/**
 * Convert ExtractedQuestion to SATMiniQuestion format
 * 
 * @param questions - Array of ExtractedQuestion
 * @param modulePrefix - Module number prefix (e.g., "1", "2", "3", "4")
 * @returns Array of SATMiniQuestion
 */
export function convertToSATMiniQuestions(
  questions: ExtractedQuestion[],
  modulePrefix: string
): SATMiniQuestion[] {
  return questions.map(q => ({
    questionId: `${modulePrefix}-${q.extractedQuestionUuid}`,
    questionContent: q.questionContent,
    options: q.questionOptions || [],
    correctAnswer: answerLetterToIndex(q.correctAnswer),
    hint: q.hint || '',
    answerExplanations: q.answerExplanations || [],
    questionReference: q.questionReference ? [{
      referenceType: q.questionReference.referenceType || 'none',
      externalKey: q.questionReference.s3Key,
      text: q.questionReference.text,
    }] : undefined,
    concept: q.concept || '',
    subtopic: q.subtopic || '',
    difficulty: q.difficulty?.toLowerCase() || 'medium',
    givenAnswer: null,
  }));
}

/**
 * Calculate accuracy from answered questions
 * 
 * @param questions - Array of questions with givenAnswer
 * @returns Accuracy percentage (0-100)
 */
export function calculateAccuracy(questions: Array<{ correctAnswer: number; givenAnswer?: number | null }>): number {
  const answered = questions.filter(q => q.givenAnswer !== null && q.givenAnswer !== undefined);
  if (answered.length === 0) return 0;

  const correct = answered.filter(q => q.givenAnswer === q.correctAnswer).length;
  return (correct / answered.length) * 100;
}

