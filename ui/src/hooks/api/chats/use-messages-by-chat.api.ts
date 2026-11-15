import { useAmplifyApiClient, useSessionContext } from "@/providers";
import { useCallback, useMemo, useState } from "react";
import { Message } from "@/lib/types";
import { ByUserApiOptions } from "../types";
import { useSubscription } from "../use-subscription";
import { usePaginatedQuery } from "../use-paginated-query.api";
import { Schema } from "@amplify/data/resource";
import { v4 as uuidv4 } from 'uuid';
import { useMutation } from "@tanstack/react-query";
import { ChatArgs, ChatType } from "./types";
import { useSendActivityLogs } from "@/hooks/useSendActivityLogs";

type RequestType = Schema['Message']['type'];

type SubscriptionInputType = {
  chatUuid: string | null;
}

export function useMessagesByChatApi({
  chatUuid,
  options,
  chatType = 'main',
  chatArgs,
}: {
  chatUuid: string | null;
  options?: ByUserApiOptions;
  chatType?: ChatType;
  chatArgs: ChatArgs;
}) {
  const client = useAmplifyApiClient();
  const { userAttributes } = useSessionContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const { sendActivity } = useSendActivityLogs();
  const createSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.Message.onCreate({
      filter: { chatUuid: { eq: input.chatUuid! } },
    }).subscribe({
      next: (data) => {
        // add element at the bottom of the list, and remove the first if over the limit;
        setMessages((prev) => [...prev, data as Message]);
      },
    });
  }, []);

  const updateSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.Message.onUpdate({
      filter: { chatUuid: { eq: input.chatUuid! } },
    }).subscribe({
      next: (data) => {
        setMessages((prev) => [...prev.map((message) => message.messageUuid === data.messageUuid ? data as Message : message)]);
      },
    });
  }, []);

  const onValidate = useCallback((input: SubscriptionInputType) => {
    return !!input.chatUuid;
  }, []);

  const subInput = useMemo(() => ({ chatUuid }), [chatUuid]);
  useSubscription<SubscriptionInputType>({
    subscriptions: 'create-update',
    input: subInput,
    onValidate,
    createFunc: createSubscription,
    updateFunc: updateSubscription,
  });

  const getMessages = useCallback(async (chatUuid: string | null, perPage: number, pageToken: string) => {
    if (!chatUuid) {
      return { data: [], nextToken: null };
    }

    const response = await client.models.Message.listMessageByChatUuidAndCreatedAt({
      chatUuid,
    }, {
      limit: perPage,
      nextToken: !pageToken ? undefined : pageToken,
      sortDirection: "DESC"
    });

    return response;
  }, []);

  const onData = useCallback((data: RequestType[]) => {
    // reverse and map vote field
    const reversed = [...data].reverse();
    const mapped = reversed.map((d) => ({
      ...d,
      vote: (d as any).vote ?? null,
    })) as unknown as Message[];
    setMessages(mapped);
  }, []);

  const { isLoading, loadNextPage, hasNextPage, refetch } = usePaginatedQuery<RequestType>({
    queryKey: ['messages', chatUuid!, options?.key || 'default'],
    queryFn: (nextPageToken) => getMessages(chatUuid!, options?.perPage || 10, nextPageToken),
    options: {
      enabled: true,
      onData,
    },
  });

  const sendMessageApi = useCallback(async ({ message, userUuid, chatUuid, image, chatType, args }: { message: string, userUuid: string, chatUuid: string, image?: string, chatType?: ChatType, args: ChatArgs }) => {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, userUuid, chatUuid, image, chatType, args }),
    });
    return response.json();
  }, []);

  async function fetchServerTimeForChat() {
    try {
      const response = await fetch('/api/ai/chat/time');
      const data = await response.json();
      return data.serverTime;
    } catch (error) {
      return null
      console.error('Failed to fetch server time:', error);
    }
  }

  const { mutateAsync: aiChat } = useMutation({
    mutationFn: sendMessageApi,
  });

  const sendMessage = useCallback(async ({ message, image }: { message: string, image?: string }) => {
    if (!chatUuid) {
      throw new Error('Chat UUID is required');
    }

    const time = await fetchServerTimeForChat()
    const now = time || new Date().toISOString();
    await client.models.Message.create({
      messageUuid: uuidv4(),
      chatUuid,
      content: message,
      image: image || null,
      role: 'user',
      createdAt: now,
      updatedAt: now,
      isCompleted: true,
    });

    // call the ai api
    const response = await aiChat({ message, userUuid: userAttributes!.userUuid, chatUuid, image, chatType, args: chatArgs });

    if (!response.success) {
      throw new Error(response.error || 'Failed to ask AI');
    }

    // The remake has no AppSync subscriptions, so nothing pushes the assistant
    // reply into the list. Re-read the messages instead.
    await refetch();

    sendActivity({
      email: userAttributes?.email ?? '',
      lastActivityDate: new Date().toISOString(),
      traits: {
        lastActivityDate: new Date().toISOString(),
      }
    })

    return response;
  }, [userAttributes, chatUuid, chatType, chatArgs, sendActivity]);

  return {
    isLoading,
    messages,
    hasNextPage,
    loadNextPage,
    sendMessage,
  };
}
