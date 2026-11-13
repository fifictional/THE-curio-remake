import { useQuestionChat } from "@/hooks/use-question-chat";
import { Chat } from "@/components/core/chat/chat";
import { useSessionContext } from "@/providers";

const NoMessagesPlaceholder = () => {
  const { userAttributes } = useSessionContext();
  return <>
    <p className="text-base">Hey {userAttributes?.givenName} 🙂</p>
    <p className="text-sm mt-1">Need help with this question?</p>
  </>;
};

export function QuestionChat() {
  const {
    chatUuid,
    messages,
    localTempMessage,
    setLocalTempMessage,
    sendMessage,
    isChatsLoading,
    waitingFor,
    hasMoreMessages,
    loadMore,
    isChatDisabled,
  } = useQuestionChat();

  return <Chat 
      chatUuid={chatUuid}
      chatPlaceholder="Ask me anything about the question"
      noMessagesPlaceholder={<NoMessagesPlaceholder />}
      messages={messages}
      localTempMessage={localTempMessage || null}
      setLocalTempMessage={setLocalTempMessage || (() => {})}
      sendMessage={sendMessage}
      isLoading={isChatsLoading}
      waitingForResponse={waitingFor === 'chat'}
      hasMoreMessages={hasMoreMessages}
      loadMore={loadMore}
      showWebSearch={false}
      defaultWebSearchEnabled={false}
      isMockExamChat={true}
      disabled={isChatDisabled}
    />;
}