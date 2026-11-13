import { useMockExamChat } from "@/hooks/use-mock-exam-chat";
import { Chat } from "@/components/core/chat/chat";
import { ModalBuyBundles } from "@/components/exam-bundles/modal-buy-bundles";

export function MockExamChat() {
  const {
    chatUuid,
    loadingQuizPage,
    messages,
    localTempMessage,
    setLocalTempMessage,
    sendMessage,
    isChatsLoading,
    waitingFor,
    hasMoreMessages,
    loadMore,
    bubbleSuggestions,
    handleSuggestionUsed,
    isPaidPlanModalOpen,
    setIsPaidPlanModalOpen,
  } = useMockExamChat();

  return <div className="h-full">
    {loadingQuizPage && <div className="h-full flex flex-col justify-center items-center gap-10">
      <span className="text-gray-500 text-3xl font-bold">Generating your mock exam...</span>
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
    </div>}
    {!loadingQuizPage && (<>
      <Chat 
        chatUuid={chatUuid}
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
        bubbleSuggestions={bubbleSuggestions}
        onSuggestionUsed={handleSuggestionUsed}
        isMockExamChat={true}
      />
      <ModalBuyBundles open={isPaidPlanModalOpen} onOpenChange={setIsPaidPlanModalOpen} />
    </>)}
  </div>;
}