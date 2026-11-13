import { useAmplifyApiClient, useSessionContext } from "@/providers";
import { useCallback, useMemo, useState } from "react";
import { Chat } from "@/lib/types";
import { ByUserApiOptions } from "../types";
import { usePaginatedQuery } from "../use-paginated-query.api";
import { Schema } from "@amplify/data/resource";
import { useSubscription } from "../use-subscription";

type RequestType = Schema['Chat']['type'];

type SubscriptionInputType = {
  userUuid: string | null;
}

const selectionSet = ['chatUuid', 'userUuid', 'documentUuid', 'spaceUuid', 'name', 'createdAt', 'updatedAt', 'space.name', 'space.spaceUuid'];

export function useChatsByUserApi({ 
  userUuid,
  options,
  noDocumentOnly,
}: {
  userUuid: string | null;
  options?: ByUserApiOptions;
  noDocumentOnly: boolean;
}) {
  const client = useAmplifyApiClient();
  const [chats, setChats] = useState<Chat[]>([]);

  const createSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.Chat.onCreate({
      filter: { userUuid: { eq: input.userUuid! } },
      selectionSet: selectionSet as any,
    }).subscribe({
      next: (data) => {
        // add element on top of the list, and remove the last if over the limit;
        const chat = {
          ...data,
          spaceName: data.space?.name || 'No Folder',
          spaceUuid: data.spaceUuid || null,
        } as Chat;

        if (chats.length >= (options?.perPage || 10)) {
          setChats((prev) => [chat, ...prev.slice(0, (options?.perPage || 10) - 1)]);
        } else {
          setChats((prev) => [chat, ...prev]);
        }
      },
    });
  }, [chats, options?.perPage, options?.key]);

  const updateSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.Chat.onUpdate({
      filter: { userUuid: { eq: input.userUuid! } },
      selectionSet: selectionSet as any,
    }).subscribe({
      next: (data) => {
        setChats((prev) => prev.map((chat) => chat.chatUuid === data.chatUuid ? {
          ...data,
          spaceName: data.space?.name || 'No Folder',
          spaceUuid: data.spaceUuid || null,
        } as Chat : chat));
      },
    });
  }, []);

  const deleteSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.Chat.onDelete({
      filter: { userUuid: { eq: input.userUuid! } },
      selectionSet: selectionSet as any,
    }).subscribe({
      next: (data) => {
        setChats((prev) => prev.filter((chat) => chat.chatUuid !== data.chatUuid));
      },
    });
  }, []);

  const onValidate = useCallback((input: SubscriptionInputType) => {
    return !!input.userUuid;
  }, []);

  const subInput = useMemo(() => ({ userUuid }), [userUuid]);
  useSubscription<SubscriptionInputType>({
    subscriptions: options?.subscriptions || 'none',
    input: subInput,
    onValidate,
    createFunc: createSubscription,
    updateFunc: updateSubscription,
    deleteFunc: deleteSubscription,
  });

  const getChats = useCallback(async (userUuid: string, perPage: number, pageToken: string) => {
    const response = await client.models.Chat.listChatByUserUuidAndCreatedAt({
      userUuid,
    }, {
      filter: {
        ...(noDocumentOnly ? { documentUuid: { attributeExists: false } } : {}),
        or: [{ hideInRecent: { attributeExists: false } }, { hideInRecent: { eq: false } }],
      },
      selectionSet: selectionSet as any,
      limit: perPage,
      nextToken: !pageToken ? undefined : pageToken,
      sortDirection: "DESC"
    });

    return response;
  }, []);

  const onData = useCallback((data: RequestType[]) => {
    // add elements to prev, but remove the duplicates
    setChats(data.map((chat) => ({
      ...chat,
      spaceName: chat.space?.name || 'No Folder',
      spaceUuid: chat.spaceUuid || null,
    })) as Chat[]);
  }, []);

  const { isLoading, hasNextPage, loadNextPage } = usePaginatedQuery<RequestType>({
    queryKey: ['chats', userUuid!, options?.key || 'default'],
    queryFn: (nextPageToken) => getChats(userUuid!, options?.perPage || 10, nextPageToken),
    options: {
      enabled: !!userUuid,
      onData,
    },
  });

  return {
    isLoading,
    chats,
    hasNextPage,
    loadNextPage,
  };
}
