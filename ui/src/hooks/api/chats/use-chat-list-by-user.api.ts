import { useAmplifyApiClient } from "@/providers/amplify-provider";
import { useCallback } from "react";
import { usePaginatedQuery } from "../use-paginated-query.api";

type AdminChat = {
  chatUuid: string;
  documentUuid: string;
  spaceUuid: string;
  isOpenChat: boolean;
  name: string;
  createdAt: string;
  updatedAt: string;
  spaceName: string;
  isWebSearchCalled: boolean;
  hasThumbsDown: boolean;
  hasThumbsUp: boolean;
  messages: Message[];
};

type Message = {
  messageUuid: string;
  content: string;
  type: 'text' | 'tool';
  toolName?: string;
  role: 'user' | 'assistant';
  createdAt: string;
  updatedAt: string;
};

export function useChatListByUserApi(userUuid: string | null) {
  const client = useAmplifyApiClient();

  const getChats = useCallback(async (nextPageToken: string) => {
    if (!userUuid) {
      return { data: [], nextToken: null };
    }

    const response = await client.models.Chat.listChatByUserUuidAndCreatedAt(
      { userUuid },
      {
        limit: 25,
        nextToken: nextPageToken,
        sortDirection: 'DESC',
        selectionSet: ['chatUuid', 'documentUuid', 'spaceUuid', 'name', 'createdAt', 'updatedAt', 'space.name', 'space.spaceUuid', 'isWebSearchCalled', 'messages.*'],
      }
    );

    if (!response.data) {
      throw new Error('Failed to get chats');
    }

    const mapped = response.data.map((chat) => ({
      chatUuid: chat.chatUuid,
      documentUuid: chat.documentUuid,
      spaceUuid: chat.spaceUuid,
      name: chat.name,
      isOpenChat: chat.documentUuid === null,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      spaceName: chat.space?.name || 'No Folder',
      isWebSearchCalled: chat.isWebSearchCalled,
      hasThumbsDown: chat.messages.some((message) => message.vote === 'down'),
      hasThumbsUp: chat.messages.some((message) => message.vote === 'up'),
      messages: chat.messages.map((message) => ({
        messageUuid: message.messageUuid,
        content: message.content,
        type: message.type,
        toolName: message.toolName,
        role: message.role,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      })),
    }));

    return { data: mapped, nextToken: response.nextToken };
  }, [client, userUuid]);

  const { data: chats, isLoading, hasNextPage, loadNextPage } = usePaginatedQuery<AdminChat>({
    queryKey: ['chats-by-user', userUuid || ''],
    queryFn: getChats,
    options: {
      enabled: !!userUuid,
    },
  });

  return {
    chats,
    isLoading,
    hasNextPage,
    loadNextPage,
  };
}

