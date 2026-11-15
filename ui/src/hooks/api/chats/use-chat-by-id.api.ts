import { useAmplifyApiClient, useCoreContext, useSessionContext } from "@/providers";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Chat } from "@/lib/types";
import { ByUserApiOptions } from "../types";
import { Schema } from "@amplify/data/resource";
import { useMessagesByChatApi } from "./use-messages-by-chat.api";
import { useQuery } from "@tanstack/react-query";
import { useSubscription } from "../use-subscription";
import { ChatArgs, ChatType } from "./types";

type RequestType = Schema['Chat']['type'];
type SubscriptionInputType = {
  chatUuid: string | null;
}

const selectionSet = ['chatUuid', 'userUuid', 'documentUuid', 'spaceUuid', 'name', 'createdAt', 'updatedAt', 'space.name', 'space.spaceUuid', 'isWebSearchCalled', 'hasFlashcardsOrQuizzes'];

export function useChatByIdApi({ 
  chatUuid,
  loadMessages = true,
  chatType = 'main',
  chatArgs,
}: {
  chatUuid: string | null;
  options?: ByUserApiOptions;
  loadMessages?: boolean;
  chatType?: ChatType;
  chatArgs: ChatArgs;
}) {
  const client = useAmplifyApiClient();
  const [localTempMessage, setLocalTempMessage] = useState<{ message: string, image?: string } | null>(null);
  const { waitingForResponse, setWaitingForResponse } = useCoreContext();
  const [chat, setChat] = useState<Chat | null>(null);

  const { data: chatData, isLoading: isChatLoading } = useQuery({
    queryKey: ['chat', chatUuid!],
    queryFn: () => client.models.Chat.get({ chatUuid: chatUuid! }),
    enabled: !!chatUuid,
  });

  useEffect(() => {
    setChat(chatData?.data as Chat | null);
  }, [chatData]);

  const updateSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.Chat.onUpdate({
      filter: { chatUuid: { eq: input.chatUuid! } },
      selectionSet: selectionSet as any,
    }).subscribe({
      next: (data) => {
        setChat({
          ...data,
          spaceName: data.space?.name || 'No Folder',
          spaceUuid: data.spaceUuid || null,
        } as Chat);
      },
    });
  }, []);

  const onValidate = useCallback((input: SubscriptionInputType) => {
    return !!input.chatUuid;
  }, []);

  const subInput = useMemo(() => ({ chatUuid }), [chatUuid]);
  useSubscription<SubscriptionInputType>({
    subscriptions: 'update',
    input: subInput,
    onValidate,
    updateFunc: updateSubscription,
  });

  const { 
    messages, sendMessage, isLoading: isMessagesLoading,
    hasNextPage: hasMoreMessages, loadNextPage: loadMoreMessages
  } = useMessagesByChatApi({
    chatUuid: loadMessages ? chatUuid || null : null,
    options: { perPage: 25 },
    chatType,
    chatArgs,
  });

  const sendMessageWrapper = useCallback(async ({ message, image }: { message: string, image?: string }) => {
    try {
      setWaitingForResponse('chat');
      setLocalTempMessage({ message: message.trim(), image });
      const result = await sendMessage({ message: message.trim(), image });
      // The remake has no subscription to clear the optimistic bubble, and the
      // message list refetches the persisted row — without this the user sees
      // their message twice.
      setLocalTempMessage(null);
      return result;
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setWaitingForResponse(null);
    }
  }, [sendMessage, chatUuid]);

  return {
    isLoading: isChatLoading,
    chat,
    messages,
    localTempMessage,
    setLocalTempMessage,
    sendMessage: sendMessageWrapper,
    waitingForResponse,
    hasMoreMessages: hasMoreMessages,
    loadMore: loadMoreMessages,
    isLoadingMessages: isMessagesLoading,
  };
}
