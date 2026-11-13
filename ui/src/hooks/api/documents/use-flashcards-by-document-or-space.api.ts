import { useChatContext, useCoreContext } from "@/providers";
import { useFlashcardDecksByDocumentApi, useFlashcardDecksByChatApi } from "../flashcards/use-flashcard-decks.api";

export const useFlashcardByDocumentOrSpaceApi = () => {
  const { documentUuid } = useCoreContext();
  const { chatUuid } = useChatContext();

  // Use deck-based hooks only
  const { flashcards: deckDocumentFlashcards, isLoading: isLoadingDeckDocumentFlashcards } = useFlashcardDecksByDocumentApi({ documentUuid: documentUuid });
  const { flashcards: deckChatFlashcards, isLoading: isLoadingDeckChatFlashcards } = useFlashcardDecksByChatApi({ chatUuid: chatUuid });

  if (chatUuid) {
    return {
      flashcards: deckChatFlashcards,
      isLoading: isLoadingDeckChatFlashcards,
    };
  }

  if (documentUuid) {
    return {
      flashcards: deckDocumentFlashcards,
      isLoading: isLoadingDeckDocumentFlashcards,
    };
  }

  // For space views, return empty (spaces don't have direct flashcard decks)
  return {
    flashcards: [],
    isLoading: false,
  };
}