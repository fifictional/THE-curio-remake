import { useChatsByDocumentApi } from "@/hooks/api/chats";
import { useCoreContext } from "@/providers/core-provider";
import { Chat } from "../chat";
import { useCommonContext } from "@/providers/common-provider";
import { CurioLoadingWithSearch } from "@/components/ui/curio-loading-search";
import { useLoadingMessage } from "@/hooks/use-loading-message";

export function ChatAsTab() {
  const { document, waitingFor, documentSummary } = useCoreContext();
  const { isLoading: isChatsLoading, messages, localTempMessage,
    setLocalTempMessage, sendMessage, hasMoreMessages, loadMore }
    = useChatsByDocumentApi({
      documentUuid: document?.documentUuid || null,
    });

  // Chat is disabled if summary is not completed (check status instead of summaryCompletedDocumentsUuids)
  const isDisabled = documentSummary?.status !== 'completed' && !documentSummary?.summary;

  return <Chat
    chatUuid={document?.chatUuid || null}
    messages={messages}
    noMessagesPlaceholder={isDisabled ? <ChatAsTabPlaceholder docType={document?.type?.toLowerCase() !== 'youtube' ? 'pdf' : 'youtube'} /> : undefined}
    chatPlaceholder={isDisabled ? 'Analyzing document...' : document?.type?.toLowerCase() !== 'youtube' ? 'Ask me anything about the document' : 'Ask me anything about the video'}
    localTempMessage={localTempMessage || null}
    setLocalTempMessage={setLocalTempMessage || (() => { })}
    sendMessage={sendMessage}
    isLoading={isChatsLoading}
    waitingForResponse={waitingFor === 'chat'}
    hasMoreMessages={hasMoreMessages}
    loadMore={loadMore}
    showWebSearch={false}
    disabled={isDisabled} />
}

export function ChatAsTabPlaceholder({ docType }: { docType: 'pdf' | 'youtube' }) {
  const { message } = useLoadingMessage()
  return <>
    <CurioLoadingWithSearch message={message} />
  </>;
}