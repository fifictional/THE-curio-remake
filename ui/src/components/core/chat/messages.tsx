import { Message } from "@/lib/types";
import { MessageUI } from "./message-ui";
import { useSessionContext } from "@/providers/session-provider";

type Props = {
  chatUuid: string | null;
  messages: Message[];
  noMessagesPlaceholder?: React.ReactNode;
  hasMoreMessages: boolean;
  loadMore: () => void;
  localTempMessage: { message: string, image?: string } | null;
  waitingForResponse: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  lastUserMessageRef: React.RefObject<HTMLDivElement>;
  messageContainerRef: React.RefObject<HTMLDivElement>;
}

export function Messages({
  chatUuid,
  messages,
  noMessagesPlaceholder,
  hasMoreMessages,
  loadMore,
  localTempMessage,
  waitingForResponse,
  messagesEndRef,
  lastUserMessageRef,
  messageContainerRef,
  
}: Props) {
  const { userAttributes } = useSessionContext();

  // Find the index of the last user message
  const lastUserMessageIndex = localTempMessage
    ? messages.length // localTempMessage is always the last user message if it exists
    : messages.map(m => m.role).lastIndexOf('user');

  return (
    <div className="h-full">
      {hasMoreMessages && (
        <div className="text-center text-gray-500">
          <p className="text-base" onClick={loadMore}>Load older messages</p>
        </div>
      )}
      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center p-4">
          <div className="text-center text-gray-500">
            {noMessagesPlaceholder || (<>
              <p className="text-base">Hi {userAttributes?.givenName} 🙂</p>
              <p className="text-sm mt-1">What can I help you with today?</p>
            </>)}
          </div>
        </div>
      ) : (
        <div className="px-6 space-y-4 messages-container" ref={messageContainerRef} data-testid="messages-container">
          {messages.map((msg, index) => {
            const isLastUserMessage = !localTempMessage && index === lastUserMessageIndex;
            const messageUI = (
              <MessageUI
                key={msg.messageUuid}
                uuid={msg.messageUuid}
                chatUuid={chatUuid}
                message={msg.content || ''}
                role={msg.role || 'assistant'}
                image={msg.image || undefined}
                type={msg.type || 'text'}
                toolName={msg.toolName || undefined}
                toolArguments={msg.toolArguments || undefined}
                toolExtras={msg.toolExtras || undefined}
                messageUuid={msg.messageUuid}
                currentVote={(msg as any).vote ?? null}
                isCompleted={msg.isCompleted || false}
                agentStatus={msg.agentStatus || null}
                agentStatusMessage={msg.agentStatusMessage || null}
              />
            );

            return isLastUserMessage ? (
              <div key={msg.messageUuid} ref={lastUserMessageRef}>
                {messageUI}
              </div>
            ) : messageUI;
          })}
          {localTempMessage && (
            <div ref={lastUserMessageRef}>
              <MessageUI uuid={'local-temp-message'} chatUuid={chatUuid} message={localTempMessage.message} role="user" image={localTempMessage.image || undefined} isCompleted={true} />
            </div>
          )}
          <span ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}