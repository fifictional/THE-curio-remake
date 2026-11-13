import { useCoreContext } from "@/providers";
import { useEffect, useMemo, useState } from "react";
import { useChatByIdApi } from "./api/chats";
import { v4 as uuidv4 } from 'uuid';
import { useParams, useSearchParams } from "next/navigation";
import { useMockExamsAttemptsByMockExam } from "./api/mock-exams/use-mock-exam-logs-by-mock-exam.api";

export const useQuestionChat = () => {
  const { waitingFor } = useCoreContext();
  const { mockExamUuid } = useParams();
  const searchParams = useSearchParams();
  const [chatUuid, setChatUuid] = useState<string>(uuidv4());
  
  const { mockExamLogs, isLoading: isMockExamLogsLoading } = useMockExamsAttemptsByMockExam({ mockExamUuid: mockExamUuid as string });
  const questionIndexRaw = searchParams.get('question');
  const questionIndex = questionIndexRaw ? parseInt(questionIndexRaw, 10) : 0;

  const isTestInProgress = useMemo(() => {
    return mockExamLogs?.[0]?.status === 'IN_PROGRESS';
  }, [mockExamLogs]);

  useEffect(() => {
    // if first log and answer by index has a chat id, use it, otherwise keep the one we already have
    if (mockExamLogs?.[0]) {
      const questionAnswer = mockExamLogs?.[0]?.questionAnswers?.find((qa) => qa!.index === questionIndex);
      if (questionAnswer?.chatUuid) {
        setChatUuid(questionAnswer?.chatUuid);
      } else {
        setChatUuid(uuidv4());
      }
    }
  }, [mockExamLogs, questionIndex]);

  const { 
    isLoading: isChatsLoading, messages,
    localTempMessage, setLocalTempMessage, sendMessage, 
    hasMoreMessages, loadMore } = useChatByIdApi(
    { 
      chatUuid,
      chatType: 'question',
      chatArgs: {
        mockExamLogUuid: mockExamLogs?.[0]?.mockExamLogUuid || '',
        questionIndex: questionIndex,
      },
    });

  return {
    chatUuid,
    messages,
    localTempMessage,
    setLocalTempMessage,
    sendMessage,
    isChatsLoading,
    waitingFor,
    hasMoreMessages,
    loadMore,
    isChatDisabled: !isTestInProgress,
  };
};