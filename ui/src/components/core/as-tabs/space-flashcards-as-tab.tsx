import { usePanelFlashcards } from "@/hooks/use-panel-flashcards";
import { SpaceFlashcards } from "../space-flashcards";

export function SpaceFlashcardsAsTab() {
  const { flashcards, isStillProcessingFlashcards, currentFlashcardIndex, goToNextFlashcard, goToPreviousFlashcard, handleDelete, handleRename } = usePanelFlashcards();

  return <SpaceFlashcards 
    isStillProcessingFlashcards={isStillProcessingFlashcards} 
    flashcards={flashcards} 
    currentFlashcardIndex={currentFlashcardIndex} 
    goToNextFlashcard={goToNextFlashcard} 
    goToPreviousFlashcard={goToPreviousFlashcard} 
    handleDelete={handleDelete} 
    handleRename={handleRename} 
  />;
}