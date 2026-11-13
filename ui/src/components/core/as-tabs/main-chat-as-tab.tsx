import { useChatByIdApi } from "@/hooks/api/chats";
import { useCoreContext } from "@/providers/core-provider";
import { Chat } from "../chat";
import { useChatContext } from "@/providers";
import { useSearchParams } from "next/navigation";

export function MainChatAsTab() {
  const { chatUuid } = useChatContext();
  const params = useSearchParams();
  const defaultWebSearchEnabled = params.get('webSearchEnabled') === 'true';
  const { waitingFor } = useCoreContext();

  const { isLoading: isChatsLoading, messages, localTempMessage,
    setLocalTempMessage, sendMessage, hasMoreMessages, loadMore } 
    = useChatByIdApi({ 
      chatUuid: chatUuid || null,
      chatType: 'main',
      chatArgs: {
        chatUuid: chatUuid || '',
        webSearch: defaultWebSearchEnabled
      } 
    });
  
  return <div className="h-full px-4">
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
      defaultWebSearchEnabled={defaultWebSearchEnabled}
    />
  </div>;
}
