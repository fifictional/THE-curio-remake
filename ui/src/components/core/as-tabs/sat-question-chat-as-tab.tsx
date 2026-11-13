"use client";

import { useCommonContext, useCoreContext } from "@/providers";
import { useSATQuestionChat } from "@/hooks/use-sat-question-chat";
import { Chat } from "../chat";
import { useChatByIdApi } from "@/hooks/api/chats/use-chat-by-id.api";
import { useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAnalytics } from "@/providers/analytics-provider";

export function SATQuestionChatAsTab() {
  const params = useParams();
  const logUuid = params?.logUuid as string | undefined;
  
  const { currentQuestion } = useCommonContext();
  const { waitingFor } = useCoreContext();
  const { track } = useAnalytics();
  const { 
    startChatWithQuestion, 
    isCreatingChat, 
    chatUuid,
    initialMessage,
    referenceData,
    resetChat
  } = useSATQuestionChat(logUuid);

  const { 
    messages, 
    localTempMessage, 
    setLocalTempMessage, 
    sendMessage, 
    hasMoreMessages, 
    loadMore,
    isLoadingMessages,
  } = useChatByIdApi({
    chatUuid: chatUuid || null,
    loadMessages: !!chatUuid,
    chatType: 'main',
    chatArgs: {
      chatUuid: chatUuid || '',
      webSearch: false,
      referenceData,
    }
  });

  // Send initial message with reference data when chat is created
  useEffect(() => {
    if (!initialMessage || !chatUuid) return;
    if ((messages?.length || 0) > 0 || localTempMessage) return;
    if (isLoadingMessages) return;
    
    sendMessage({ message: initialMessage });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage, chatUuid, messages, isLoadingMessages]);

  // Suggested prompts for starting a chat
  const bubbleSuggestions = useMemo(() => {
    if (!currentQuestion || chatUuid) return undefined;
    
    return [
      { label: "Explain this question", message: "Can you explain this question to me?", send: true },
      { label: "What concept is tested?", message: "What concept is being tested here?", send: true },
      { label: "How to approach?", message: "How should I approach this problem?", send: true },
      { label: "Step-by-step breakdown", message: "Can you break down the question step by step?", send: true },
    ];
  }, [currentQuestion, chatUuid]);

  const handleSuggestionUsed = (payload: { label: string; message: string; send: boolean }) => {
    if (payload.send && !chatUuid) {
      // Track suggestion click (chat start intent)
      track('sat_exam_question_chat_suggestion_clicked', {
        exam_uuid: logUuid || 'unknown',
        question_id: currentQuestion?.questionId || 'unknown',
        suggestion_label: payload.label,
      });
      startChatWithQuestion(payload.message);
    }
  };

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <div>
          <p className="text-gray-600 mb-2">No question selected</p>
          <p className="text-sm text-gray-500">Start taking an exam to ask questions about it</p>
        </div>
      </div>
    );
  }

  const noMessagesPlaceholder = !chatUuid ? (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Ask about this question</h3>
        <p className="text-sm text-gray-600 mb-4">
          I can help explain concepts, break down the problem, or guide you through the solution—without giving away the answer!
        </p>
        <p className="text-xs text-gray-500">Click a suggestion below to start chatting</p>
      </div>
    </div>
  ) : undefined;

  return (
    <div className="px-4 h-full">
      <Chat 
        chatUuid={chatUuid}
        messages={messages}
        chatPlaceholder="Ask a question about this SAT problem..."
        noMessagesPlaceholder={noMessagesPlaceholder}
        localTempMessage={localTempMessage || null}
        setLocalTempMessage={setLocalTempMessage || (() => {})}
        sendMessage={(args) => {
          track('sat_exam_question_chat_message_sent', {
            exam_uuid: logUuid || 'unknown',
            question_id: currentQuestion?.questionId || 'unknown',
            has_reference: !!referenceData && referenceData.length > 0,
          });
          return sendMessage(args);
        }}
        isLoading={isCreatingChat}
        waitingForResponse={waitingFor === 'chat'}
        hasMoreMessages={hasMoreMessages}
        loadMore={loadMore}
        showWebSearch={false}
        defaultWebSearchEnabled={false}
        bubbleSuggestions={bubbleSuggestions}
        onSuggestionUsed={handleSuggestionUsed}
      />
    </div>
  );
}

