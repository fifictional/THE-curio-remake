import { Logger } from "@aws-lambda-powertools/logger";
import { FlashcardsType } from "../../ai/validations/outputs-validations";
import { createFlashcardDeck } from "./create-flashcard-deck";

const logger = new Logger({
  logLevel: "INFO",
  serviceName: "document-processor/create-flashcards",
});

export const createFlashcards = async (documentUuid: string, userUuid: string, flashcards: FlashcardsType, spaceUuid: string | null) => {
  logger.info('Creating flashcards as deck:', { documentUuid, userUuid, flashcardCount: flashcards.flashcards.length });

  // Create a single FlashcardDeck instead of individual flashcards
  await createFlashcardDeck({
    userUuid: userUuid,
    documentUuid: documentUuid,
    flashcards: flashcards.flashcards.map(flashcard => ({
      title: flashcard.title,
      content: flashcard.content,
      references: flashcard.references,
    })),
  });
};