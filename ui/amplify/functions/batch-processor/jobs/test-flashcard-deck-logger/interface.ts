/**
 * Test job: Log flashcard deck card counts
 * 
 * Creator: Queues every FlashcardDeck UUID
 * Mutator: Logs how many cards are in each deck
 */

export const JOB_NAME = "test-flashcard-deck-logger";

export type TestFlashcardDeckLoggerJob = {
  flashcardDeckUuid: string;
};

