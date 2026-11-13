import { useAmplifyApiClient, useSessionContext } from "@/providers";
import { useCallback, useMemo, useState } from "react";
import { ChatCitation } from "@/lib/types";
import { ByUserApiOptions } from "../types";
import { useSubscription } from "../use-subscription";
import { usePaginatedQuery } from "../use-paginated-query.api";
import { Schema } from "@amplify/data/resource";

type RequestType = Schema['ChatCitation']['type'];

type SubscriptionInputType = {
  chatUuid: string | null;
}

export function useChatCitationsApi({ 
  chatUuid,
  options,
}: {
  chatUuid: string | null;
  options?: ByUserApiOptions;
}) {
  const client = useAmplifyApiClient();
  const { userAttributes } = useSessionContext();
  const [citations, setCitations] = useState<ChatCitation[]>([]);

  const createSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.ChatCitation.onCreate({
      filter: { chatUuid: { eq: input.chatUuid! } },
    }).subscribe({
      next: (data) => {
        // add element at the bottom of the list, and remove the first if over the limit;
        setCitations((prev) => [...prev, data]);
      },
    });
  }, []);

  const onValidate = useCallback((input: SubscriptionInputType) => {
    return !!input.chatUuid;
  }, []);

  const subInput = useMemo(() => ({ chatUuid }), [chatUuid]);
  useSubscription<SubscriptionInputType>({
    subscriptions: 'create',
    input: subInput,
    onValidate,
    createFunc: createSubscription,
  });

  const getCitations = useCallback(async (chatUuid: string, perPage: number, pageToken: string) => {
    const response = await client.models.ChatCitation.listChatCitationByChatUuidAndCreatedAt({
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
    })) as unknown as ChatCitation[];
    setCitations(mapped);
  }, []);

  const { isLoading, loadNextPage, hasNextPage } = usePaginatedQuery<RequestType>({
    queryKey: ['citations', chatUuid!, options?.key || 'default'],
    queryFn: (nextPageToken) => getCitations(chatUuid!, options?.perPage || 10, nextPageToken),
    options: {
      enabled: !!chatUuid,
      onData,
    },
  });

  return {
    isLoading,
    citations,
    hasNextPage,
    loadNextPage,
  };
}
