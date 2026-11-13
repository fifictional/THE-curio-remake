import { Features } from "@/components/core/core-actions-tabs";
import { useCommonContext, useCoreContext } from "@/providers";
import { usePathname } from "next/navigation";

interface UseLoadingTabsProps {
  userUuid: string | null;
  documentUuid: string | null;
  isSpaceLibrary?: boolean
}

export function useLoadingTabs({ userUuid, documentUuid, isSpaceLibrary }: UseLoadingTabsProps) {
  const pathname = usePathname();
  const isChatPage = pathname.includes('/chats');
  const { spaceDocumentProcessing, spaceDocumentLoading } = useCoreContext()

  const { documentSummary } = useCoreContext();
  const { processingDocumentsUuids } = useCommonContext();
  const isStillProcessingSummary = (isSpaceLibrary && spaceDocumentProcessing) || (documentUuid && (!documentSummary || documentSummary?.status === 'started'));

  // Check if document is currently processing
  const isDocumentProcessing = (isSpaceLibrary && spaceDocumentLoading) || (documentUuid && processingDocumentsUuids.includes(documentUuid));

  // For flashcards: still processing if summary is processing OR document is actively processing
  // BUT: never show loading state on chat pages (flashcards/quizzes come from chat, not documents)
  const isStillProcessingFlashcards = isChatPage ? false : (isStillProcessingSummary || isDocumentProcessing);
  // For quizzes: same logic
  const isStillProcessingQuizzes = isChatPage ? false : (isStillProcessingSummary || isDocumentProcessing);

   const isStillProcessingChat = isChatPage ? false : (isStillProcessingSummary || isDocumentProcessing);

  const loadingTabs: Features[] = [];
  if (isStillProcessingSummary) {
    loadingTabs.push('summary');
  }
  if (isStillProcessingFlashcards) {
    loadingTabs.push('flashcards');
  }
  if (isStillProcessingQuizzes) {
    loadingTabs.push('quiz');
  }

  if(isStillProcessingChat) {
    loadingTabs.push('chat');
  }

  return { loadingTabs };
}