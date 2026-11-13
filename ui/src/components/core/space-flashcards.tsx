'use client';

import { Flashcard } from "../ui/flashcard";
import { Pagination } from "../ui/pagination";
import Image from "next/image";
import { Flashcard as FlashcardType, FlashcardItem } from "@/lib/types";
import { CurioLoadingWithSearch } from "../ui/curio-loading-search";
import { useLoadingMessage } from "@/hooks/use-loading-message";

interface SpaceFlashcardsProps {
  isStillProcessingFlashcards: boolean;
  flashcards: (FlashcardType | FlashcardItem)[];
  currentFlashcardIndex: number;
  goToNextFlashcard: () => void;
  goToPreviousFlashcard: () => void;
  handleDelete: ({ flashcardUuid }: { flashcardUuid: string }) => Promise<boolean>;
  handleRename: ({ flashcardUuid, title, content }: { flashcardUuid: string, title: string, content: string }) => Promise<boolean>;
}

export function SpaceFlashcards({ isStillProcessingFlashcards, flashcards, currentFlashcardIndex, goToNextFlashcard, goToPreviousFlashcard, handleDelete, handleRename }: SpaceFlashcardsProps) {
  const { message } = useLoadingMessage()
  return (
    <div className="p-4 flex flex-col h-full">
      {isStillProcessingFlashcards && flashcards.length === 0 && <CurioLoadingWithSearch message={message} />}
      {flashcards.length === 0 && !isStillProcessingFlashcards && (
        <div className="flex-1 flex flex-col gap-10 justify-center items-center">
          <p className="text-baseline text-gray-500">No relevant flashcards found</p>
          <p className="flex justify-center items-center">
            <Image src="/no-flash-no-quiz.png" alt="No relevant flashcards found" width={200} height={400} />
          </p>
        </div>
      )}
      {flashcards.length > 0 && (
        <div className="flex-1 flex flex-col">
          <div className="overflow-hidden flex justify-center">
            <Flashcard
              flashcardUuid={flashcards[currentFlashcardIndex].flashcardUuid}
              onDelete={handleDelete}
              onRename={handleRename}
              key={flashcards[currentFlashcardIndex].flashcardUuid}
              title={flashcards[currentFlashcardIndex].title}
              content={flashcards[currentFlashcardIndex].content}
            />
          </div>
          <Pagination
            currentIndex={currentFlashcardIndex}
            total={flashcards.length}
            onNext={goToNextFlashcard}
            onPrevious={goToPreviousFlashcard}
            testIdPrefix="flashcard"
          />
        </div>
      )}
    </div>
  );
}


