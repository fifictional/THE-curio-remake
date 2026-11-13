/**
 * Space Flashcard Embed Job (EOPRD-813)
 *
 * Creator: Queues each space that has flashcards (from documents or chats)
 * Mutator: Embeds flashcard content (front + back) into OpenSearch for RAG retrieval
 */

export const JOB_NAME = "space-flashcard-embed";

export type SpaceFlashcardEmbedJob = {
  spaceUuid: string;
  userUuid: string;
};
