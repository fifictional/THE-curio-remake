
import { useChatContext, useCoreContext, useSpaceContext } from "@/providers";
import { useQuestionsByDocumentApi } from "./use-questions-by-document.api";
import { useQuestionsBySpaceApi } from "../spaces";
import { useQuestionsByChatApi } from "../spaces/use-questions-by-chat.api";

export const useQuestionsByDocumentOrSpaceApi = () => {
  const { spaceUuid } = useSpaceContext();
  const { documentUuid } = useCoreContext();
  const { chatUuid } = useChatContext();

  const { questions: documentQuestions, isLoading: isLoadingDocumentQuestions } = useQuestionsByDocumentApi({ documentUuid: documentUuid });
  const { questions: spaceQuestions, isLoading: isLoadingSpaceQuestions } = useQuestionsBySpaceApi({ spaceUuid: spaceUuid });
  const { questions: chatQuestions, isLoading: isLoadingChatQuestions } = useQuestionsByChatApi({ chatUuid: chatUuid });

  if (chatUuid) {
    return {
      questions: chatQuestions,
      isLoading: isLoadingChatQuestions,
    };
  }
  if (documentUuid) {
    return {
      questions: documentQuestions,
      isLoading: isLoadingDocumentQuestions,
    };
  }

  return {
    questions: spaceQuestions,
    isLoading: isLoadingSpaceQuestions,
  };
}