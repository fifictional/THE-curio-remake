import { useAmplifyApiClient, useCoreContext, useSessionContext } from "@/providers";
import { useCallback, useEffect, useState } from "react";
import { Chat } from "@/lib/types";
import { ByUserApiOptions } from "../types";
import { usePaginatedQuery } from "../use-paginated-query.api";
import { Schema } from "@amplify/data/resource";
import { useMessagesByChatApi } from "./use-messages-by-chat.api";
import { v4 as uuidv4 } from 'uuid';
import { emitter } from "@/hooks/use-events";
import { ChatArgs, ChatType, DocumentChatArgs } from "./types";

type RequestType = Schema['Chat']['type'];
const selectionSet = ['chatUuid', 'userUuid', 'documentUuid', 'spaceUuid', 'name', 'createdAt', 'updatedAt', 'space.name', 'space.spaceUuid', 'isWebSearchCalled', 'hasFlashcardsOrQuizzes'];

export function useChatsByDocumentApi({ 
  documentUuid,
  options,
}: {
  documentUuid: string | null;
  options?: ByUserApiOptions;
}) {
  const client = useAmplifyApiClient();
  const { userAttributes } = useSessionContext();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [localTempMessage, setLocalTempMessage] = useState<{ message: string, image?: string } | null>(null);
  const { waitingForResponse, setWaitingForResponse } = useCoreContext();

  const { messages, sendMessage, isLoading: isMessagesLoading, 
    hasNextPage: hasMoreMessages, loadNextPage: loadMoreMessages } 
    = useMessagesByChatApi({
      chatUuid: selectedChat?.chatUuid || null,
      options: { perPage: 25 },
      chatType: 'document',
      chatArgs: { 
        documentUuid: documentUuid || '',
        chatUuid: selectedChat?.chatUuid || '',
        webSearch: false 
      } 
    });

  const createChat = useCallback(async () => {
    const now = new Date().toISOString();
    if (!userAttributes) {
      throw new Error('User not found');
    }

    const chat = await client.models.Chat.create({
      userUuid: userAttributes.userUuid,
      documentUuid: documentUuid || '',
      chatUuid: uuidv4(),
      createdAt: now,
      updatedAt: now,
      isWebSearchCalled: false,
      hasFlashcardsOrQuizzes: false,
      name: '',
    });

    if (!chat.data) {
      throw new Error('Failed to create chat');
    }

    const newChat = {
      ...chat.data,
      spaceName: '',
      name: '',
      isWebSearchCalled: false,
      hasFlashcardsOrQuizzes: false,
      messages: [],
    };

    setChats((prev) => [newChat, ...prev]);
    setSelectedChat(newChat);

    return newChat;
  }, [userAttributes, documentUuid]);

  useEffect(() => {
    // reset the selected chat
    setSelectedChat(null);
  }, [documentUuid]);

  const getChats = useCallback(async (documentUuid: string, perPage: number, pageToken: string) => {
    const response = await client.models.Chat.listChatByDocumentUuidAndCreatedAt({
      documentUuid,
    }, {
      filter: userAttributes?.userUuid ? { userUuid: { eq: userAttributes.userUuid } } : undefined,
      selectionSet: selectionSet as any,
      limit: perPage,
      nextToken: !pageToken ? undefined : pageToken,
      sortDirection: "DESC"
    });

    return response;
  }, [client, userAttributes?.userUuid]);

  const onData = useCallback((data: RequestType[]) => {
    // add elements to prev, but remove the duplicates
    setChats([...data.map((chat) => ({
      ...chat,
      spaceName: chat.space?.name || '',
    })) as Chat[]]);
    if (data.length > 0) {
      setSelectedChat({
        ...data[0],
        spaceName: data[0].space?.name || '',
        name: data[0].name || '',
        isWebSearchCalled: data[0].isWebSearchCalled || false,
        hasFlashcardsOrQuizzes: data[0].hasFlashcardsOrQuizzes || false,
        spaceUuid: data[0].spaceUuid || null,
        documentUuid
      });
    }
  }, []);

  const { isLoading } = usePaginatedQuery<RequestType>({
    queryKey: ['chats', documentUuid!, options?.key || 'default'],
    queryFn: (nextPageToken) => getChats(documentUuid!, options?.perPage || 10, nextPageToken),
    options: {
      enabled: !!documentUuid,
      onData,
    },
  });

  const sendMessageWrapper = useCallback(async ({ message, image, isExplain }: { message: string, image?: string, isExplain?: boolean }) => {
    try {
      setWaitingForResponse('chat');
      if (!selectedChat) {
        const chat = await createChat();
        if (!chat) {
          throw new Error('Failed to create chat');
        }
        setLocalTempMessage({ message: message.trim(), image });
        setSelectedChat(chat);
      } else {
        setLocalTempMessage({ message: message.trim(), image });
        return await sendMessage({
          message: message.trim(),
          image
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setWaitingForResponse(null);
    }
  }, [selectedChat, createChat, sendMessage, documentUuid]);

  useEffect(() => {
    if (!localTempMessage) return;
    if (!selectedChat) return;

    sendMessage({
      message: localTempMessage.message,
      image: localTempMessage.image
    });

    setLocalTempMessage(null);
  }, [selectedChat]);

  useEffect(() => {
    const onExplain = async (wrappedMessage: string) => {
      const { text, image } = JSON.parse(wrappedMessage);
      if (text) {
        await sendMessageWrapper({
          message: `Curio, can you please explain this to me? "${text}"`,
        });
      } else if (image) {
        await sendMessageWrapper({
          message: `Curio, can you please explain this image to me?`,
          image,
        });
      }
    };
    emitter.on('core:explain', onExplain);
    return () => emitter.off('core:explain', onExplain);
  }, [sendMessageWrapper]);

  return {
    isLoading,
    chats,
    messages,
    localTempMessage,
    setLocalTempMessage,
    sendMessage: sendMessageWrapper,
    waitingForResponse,
    hasMoreMessages: hasMoreMessages,
    loadMore: loadMoreMessages,
  };
}
