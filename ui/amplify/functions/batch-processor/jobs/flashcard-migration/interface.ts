/**
 * Flashcard Migration Job
 * 
 * Creator: Queues every Document and Chat UUID for flashcard migration
 * Mutator: Processes each document/chat by:
 *   - Finding all flashcards for the document/chat
 *   - Creating or updating a FlashcardDeck
 *   - Updating the document/chat to reference the deck
 */

export const JOB_NAME = "flashcard-migration";

export type MigrationJob = {
  type: 'document' | 'chat';
  uuid: string;
};

