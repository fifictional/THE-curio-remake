import { useCallback, useMemo, useState } from "react";
import { useFlashcardDecksByDocumentApi, useFlashcardDecksByChatApi, useFlashcardDecksBySpaceApi } from "./api/flashcards/use-flashcard-decks.api";
import { useAmplifyApiClient, useAmplifyUserApiClient, useCommonContext, useCoreContext, useChatContext, useSpaceContext } from "@/providers";
import { useAnalytics } from "@/providers";

export function usePanelFlashcards() {
  const { document } = useCoreContext();
  const { chatUuid } = useChatContext();
  const { spaceUuid } = useSpaceContext();

  // Use new deck-based hooks only
  const { flashcards: deckFlashcards, isLoading: isLoadingDecks } = useFlashcardDecksByDocumentApi({
    documentUuid: document?.documentUuid || null
  });
  const { flashcards: chatDeckFlashcards, isLoading: isLoadingChatDecks } = useFlashcardDecksByChatApi({
    chatUuid: chatUuid
  });
  const { flashcards: spaceDeckFlashcards, isLoading: isLoadingSpaceDecks } = useFlashcardDecksBySpaceApi({
    spaceUuid: spaceUuid || null
  });

  // Use deck-based flashcards only (no fallback to legacy)
  const flashcards = useMemo(() => {
    if (chatUuid) {
      return chatDeckFlashcards || [];
    } else if (document?.documentUuid) {
      return deckFlashcards || [];
    } else {
      return spaceDeckFlashcards || [];
    }
  }, [chatUuid, document, spaceUuid, chatDeckFlashcards, deckFlashcards, spaceDeckFlashcards]);

  const isLoading = isLoadingDecks || isLoadingChatDecks || isLoadingSpaceDecks;

  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const { track } = useAnalytics();
  const client = useAmplifyApiClient();
  const userClient = useAmplifyUserApiClient();

  const { processingDocumentsUuids, failedDocumentsUuids } = useCommonContext();

  // Check if document is currently processing
  const isDocumentProcessing = document?.documentUuid && processingDocumentsUuids.includes(document.documentUuid);
  // Check if document has failed
  const isDocumentFailed = document?.documentUuid && failedDocumentsUuids.includes(document.documentUuid);
  // If not processing and not failed, it's completed/ready (but still loading if decks are loading)
  const isStillProcessingFlashcards = isDocumentProcessing || isLoadingDecks || isLoadingChatDecks;

  const goToNextFlashcard = useCallback(() => {
    setCurrentFlashcardIndex((prev) => (prev + 1) % flashcards.length);
    track('right-panel-flashcard-next-clicked', {
      flashcardIndex: currentFlashcardIndex + 1,
      totalFlashcards: flashcards.length,
      isSpacePage: document === null,
      isDocumentPDF: document?.type !== 'youtube',
    });
  }, [flashcards.length, currentFlashcardIndex, track]);

  const goToPreviousFlashcard = useCallback(() => {
    setCurrentFlashcardIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
    track('right-panel-flashcard-previous-clicked', {
      flashcardIndex: currentFlashcardIndex + 1,
      totalFlashcards: flashcards.length,
      isSpacePage: document === null,
      isDocumentPDF: document?.type !== 'youtube',
    });
  }, [flashcards.length, currentFlashcardIndex, track]);

  const handleDelete = useCallback(async ({ flashcardUuid }: { flashcardUuid: string }) => {
    track('delete-flashcard-clicked', { flashcardUuid });

    const targetDeck = deckFlashcards.length > 0 ? deckFlashcards : chatDeckFlashcards;
    const flashcardIndex = targetDeck.findIndex(f => f.flashcardUuid === flashcardUuid);

    if (flashcardIndex === -1) {
      return false;
    }

    // Get the deck UUID from the document or chat
    let deckUuid: string | null = null;
    if (document?.documentUuid) {
      const docResponse = await userClient.models.Document.get({ documentUuid: document.documentUuid });
      deckUuid = docResponse.data?.flashcardDeckUuid || null;
    } else if (chatUuid) {
      const chatResponse = await client.models.Chat.get({ chatUuid });
      deckUuid = chatResponse.data?.flashcardDeckUuid || null;
    }

    if (!deckUuid) {
      return false;
    }

    // Get current deck and remove the flashcard
    const deckResponse = await client.models.FlashcardDeck.get({ flashcardDeckUuid: deckUuid });
    if (!deckResponse.data) {
      return false;
    }

    const updatedFlashcards = deckResponse.data.flashcards.filter((f: any) => f.flashcardUuid !== flashcardUuid);

    const updateResponse = await client.models.FlashcardDeck.update({
      flashcardDeckUuid: deckUuid,
      flashcards: updatedFlashcards,
      updatedAt: new Date().toISOString(),
    });

    return !updateResponse.errors;
  }, [flashcards, deckFlashcards, chatDeckFlashcards, document, chatUuid, client.models, userClient.models, track]);

  const handleRename = useCallback(async ({ flashcardUuid, title, content }: { flashcardUuid: string, title: string, content: string }) => {
    track('rename-flashcard-clicked', { flashcardUuid });

    // Get the deck UUID from the document or chat
    let deckUuid: string | null = null;
    if (document?.documentUuid) {
      const docResponse = await userClient.models.Document.get({ documentUuid: document.documentUuid });
      deckUuid = docResponse.data?.flashcardDeckUuid || null;
    } else if (chatUuid) {
      const chatResponse = await client.models.Chat.get({ chatUuid });
      deckUuid = chatResponse.data?.flashcardDeckUuid || null;
    }

    if (!deckUuid) {
      return false;
    }

    // Get current deck and update the flashcard
    const deckResponse = await client.models.FlashcardDeck.get({ flashcardDeckUuid: deckUuid });
    if (!deckResponse.data) {
      return false;
    }

    const updatedFlashcards = deckResponse.data.flashcards.map((f: any) =>
      f.flashcardUuid === flashcardUuid
        ? { ...f, title, content, updatedAt: new Date().toISOString() }
        : f
    );

    const updateResponse = await client.models.FlashcardDeck.update({
      flashcardDeckUuid: deckUuid,
      flashcards: updatedFlashcards,
      updatedAt: new Date().toISOString(),
    });

    return !updateResponse.errors;
  }, [flashcards, deckFlashcards, chatDeckFlashcards, document, chatUuid, client.models, userClient.models, track]);

  return {
    flashcards,
    isStillProcessingFlashcards,
    currentFlashcardIndex,
    goToNextFlashcard,
    goToPreviousFlashcard,
    handleDelete,
    handleRename,
  }
}