import { useAmplifyApiClient } from "@/providers";
import { useCallback, useMemo, useState } from "react";
import { Space } from "@/lib/types";
import { ByUserApiOptions } from "../types";
import { useSubscription } from "../use-subscription";
import { usePaginatedQuery } from "../use-paginated-query.api";
import { Schema } from "@amplify/data/resource";

type SelectionSetType = 'spaceUuid' | 'name' | 'userUuid' | 'updatedAt' | 'createdAt' | 'documents';
type DocumentSelectionSetType = 'documentUuid' | 'spaceUuid';
type ChatSelectionSetType = 'chatUuid' | 'spaceUuid';
const selectionSet = ['spaceUuid', 'name', 'userUuid', 'updatedAt', 'createdAt', 'documents.documentUuid', 'documents.spaceUuid', 'chats.chatUuid', 'chats.spaceUuid'];

type RequestType = Pick<Schema['Space']['type'], SelectionSetType> & {
  documents: Pick<Schema['Document']['type'], DocumentSelectionSetType>[];
  chats: Pick<Schema['Chat']['type'], ChatSelectionSetType>[];
};

type SubscriptionInputType = {
  userUuid: string | null;
}

export function useSpacesByUserApi({ 
  userUuid,
  options,
}: {
  userUuid: string | null;
  options?: ByUserApiOptions;
}) {
  const client = useAmplifyApiClient();

  const [spaces, setSpaces] = useState<Space[]>([]);

  const createSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.Space.onCreate({
      filter: { userUuid: { eq: input.userUuid! } },
      selectionSet: selectionSet as any,
    }).subscribe({
      next: (data) => {
        // add element on top of the list, and remove the last if over the limit;
        setSpaces((prev) => [mapSpace(data as unknown as RequestType), ...prev]);
      },
    });
  }, []);

  const updateSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.Space.onUpdate({
      filter: { userUuid: { eq: input.userUuid! } },
      selectionSet: selectionSet as any,
    }).subscribe({
      next: (data) => {
        setSpaces((prev) => prev.map((space) => space.spaceUuid === data.spaceUuid ? mapSpace(data as unknown as RequestType) : space));
      },
    });
  }, []);

  const deleteSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.Space.onDelete({
      filter: { userUuid: { eq: input.userUuid! } },
      selectionSet: selectionSet as any,
    }).subscribe({
      next: (data) => {
        setSpaces((prev) => prev.filter((space) => space.spaceUuid !== data.spaceUuid));
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

  const getSpaces = useCallback(async (userUuid: string, perPage: number, pageToken: string) => {
    const response = await client.models.Space.listSpaceByUserUuid({
      userUuid,
    }, {
      selectionSet: selectionSet as any,
      limit: perPage,
      nextToken: !pageToken ? undefined : pageToken,
    });

    return response;
  }, []);

  const onData = useCallback((data: RequestType[]) => {
    // add elements to prev, but remove the duplicates
    setSpaces(data.map(mapSpace));
  }, []);

  const { isLoading, hasNextPage, loadNextPage } = usePaginatedQuery<RequestType>({
    queryKey: ['spaces', userUuid!, options?.key || 'default'],
    queryFn: (nextPageToken) => getSpaces(userUuid!, options?.perPage || 10, nextPageToken),
    options: {
      enabled: !!userUuid,
      onData,
    },
  });

  return {
    isLoading,
    spaces,
    hasNextPage,
    loadNextPage,
  };
}

const mapSpace = (space: RequestType) => {
  return {
    ...space,
    documentsCount: (space.documents?.length || 0) + (space.chats?.length || 0),
  } as Space;
};