import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";

interface ChatAddFlashcardApiProps {
  messageUuid: string;
  userUuid: string;
  spaceUuid: string | null;
  documentUuid: string | null;
  chatUuid: string | null;
  flashcards: { title: string; content: string }[];
}

const useChatAddFlashcardApi = () => {
  const addFlashcard = useCallback(async (flashcard: ChatAddFlashcardApiProps) => {
    const response = await fetch("/api/flashcards/chat-tool", {
      method: "POST",
      body: JSON.stringify(flashcard),
    });
    if (!response.ok) {
      throw new Error('Failed to create flashcard');
    }
    return response.json();
  }, []);

  useMutation({
    mutationFn: addFlashcard,
  });

  return {
    addFlashcard,
  };
}

export default useChatAddFlashcardApi;