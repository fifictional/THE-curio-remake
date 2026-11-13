export const MEMORY_FEATURE_FLAG = 'memory_tracking';

/** Minimum confidence for stored memory (agent reflection and legacy extractors). */
export const MIN_CONFIDENCE_TO_STORE = 0.55;

/** Topic similarity for merge (DynamoDB path — normalized string overlap) */
export const TOPIC_MERGE_SIMILARITY = 0.85;

export const QUIZ_GAP_SCORE_RATIO = 0.6;
export const QUIZ_MASTERED_SCORE_RATIO = 0.85;
export const QUIZ_MASTERED_MIN_ATTEMPTS = 3;

export const BLOCK_TYPE_KNOWLEDGE_GAP = 'knowledge_gap';
export const BLOCK_TYPE_MASTERED_TOPIC = 'mastered_topic';

/** Which product surface first produced this memory block. */
export const ADDED_FROM_CHAT = 'chat';
export const ADDED_FROM_QUIZ = 'quiz';
export const ADDED_FROM_MOCK_EXAM = 'mock_exam';
export const ADDED_FROM_FLASHCARD = 'flashcard';
