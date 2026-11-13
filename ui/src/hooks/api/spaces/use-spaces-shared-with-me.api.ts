import { useAmplifyApiClient } from "@/providers";
import { useCallback, useMemo, useState } from "react";
import { Space } from "@/lib/types";
import { ByUserApiOptions } from "../types";
import { useSubscription } from "../use-subscription";
import { usePaginatedQuery } from "../use-paginated-query.api";
import { Schema } from "@amplify/data/resource";

type SelectionSetType = 'spaceUuid' | 'name' | 'userUuid' | 'updatedAt' | 'createdAt' | 'documents';
type DocumentSelectionSetType = 'documentUuid' | 'spaceUuid';
type ChatSelectionSetType = 'chatUuid' | 'spaceUuid' | 'userUuid';
const selectionSet = ['spaceUuid', 'name', 'userUuid', 'updatedAt', 'createdAt', 'documents.documentUuid', 'documents.spaceUuid', 'chats.chatUuid', 'chats.spaceUuid', 'chats.userUuid'];

type RequestType = Pick<Schema['Space']['type'], SelectionSetType> & {
  documents: Pick<Schema['Document']['type'], DocumentSelectionSetType>[];
  chats: Pick<Schema['Chat']['type'], ChatSelectionSetType>[];
};

type SubscriptionInputType = {
  userUuid: string | null;
}

export function useSpacesSharedWithMeApi({ 
  userUuid,
  options,
}: {
  userUuid: string | null;
  options?: ByUserApiOptions;
}) {
  const client = useAmplifyApiClient();

  const [spaces, setSpaces] = useState<Space[]>([]);

  const createSubscription = useCallback((input: SubscriptionInputType) => {
    // Subscribe to SpaceUsers changes for this user
    return client.models.SpaceUsers.onCreate({
      filter: { userUuid: { eq: input.userUuid! } },
    }).subscribe({
      next: async (data) => {
        // When a new SpaceUsers entry is created, fetch the Space
        if (data.spaceUuid) {
          try {
            const spaceResponse = await client.models.Space.get({
              spaceUuid: data.spaceUuid,
            }, {
              selectionSet: selectionSet as any,
            });
            if (spaceResponse.data) {
              setSpaces((prev) => {
                // Check if space already exists to avoid duplicates
                const exists = prev.some(s => s.spaceUuid === data.spaceUuid);
                if (exists) return prev;
                return [mapSpace(spaceResponse.data as unknown as RequestType, input.userUuid!), ...prev];
              });
            }
          } catch (error) {
            console.error('Failed to fetch space after SpaceUsers creation:', error);
          }
        }
      },
    });
  }, [client]);

  const updateSubscription = useCallback((input: SubscriptionInputType) => {
    // Subscribe to SpaceUsers updates for this user
    return client.models.SpaceUsers.onUpdate({
      filter: { userUuid: { eq: input.userUuid! } },
    }).subscribe({
      next: async (data) => {
        // When SpaceUsers is updated, refetch the Space
        if (data.spaceUuid) {
          try {
            const spaceResponse = await client.models.Space.get({
              spaceUuid: data.spaceUuid,
            }, {
              selectionSet: selectionSet as any,
            });
            if (spaceResponse.data) {
              setSpaces((prev) => prev.map((space) => 
                space.spaceUuid === data.spaceUuid 
                  ? mapSpace(spaceResponse.data as unknown as RequestType, input.userUuid!) 
                  : space
              ));
            }
          } catch (error) {
            console.error('Failed to fetch space after SpaceUsers update:', error);
          }
        }
      },
    });
  }, [client]);

  const deleteSubscription = useCallback((input: SubscriptionInputType) => {
    // Subscribe to SpaceUsers deletions for this user
    return client.models.SpaceUsers.onDelete({
      filter: { userUuid: { eq: input.userUuid! } },
    }).subscribe({
      next: (data) => {
        // Remove the space from the list when SpaceUsers entry is deleted
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
    // First, get all SpaceUsers entries for this user
    const spaceUsersResponse = await client.models.SpaceUsers.listSpaceUsersByUserUuid({
      userUuid,
    }, { limit: 1000 });

    const spaceUsers = spaceUsersResponse.data || [];
    const spaceUuids = spaceUsers.map(su => su.spaceUuid);

    if (spaceUuids.length === 0) {
      return {
        data: [],
        nextToken: undefined,
      };
    }

    // Fetch Spaces for all spaceUuids
    // Note: We'll need to fetch them individually or use a batch approach
    // Since Amplify doesn't support "IN" queries directly, we'll fetch them in parallel
    const spacePromises = spaceUuids.map(spaceUuid =>
      client.models.Space.get({
        spaceUuid,
      }, {
        selectionSet: selectionSet as any,
      }).catch(error => {
        console.error(`Failed to fetch space ${spaceUuid}:`, error);
        return null;
      })
    );

    const spaceResponses = await Promise.all(spacePromises);
    const spaces = spaceResponses
      .filter(response => response?.data !== null && response?.data !== undefined)
      .map(response => response!.data as unknown as RequestType);

    // Sort by updatedAt descending (most recent first)
    spaces.sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return dateB - dateA;
    });

    // Simple pagination: slice the results
    const startIndex = pageToken ? parseInt(pageToken, 10) : 0;
    const endIndex = startIndex + perPage;
    const paginatedSpaces = spaces.slice(startIndex, endIndex);
    const nextToken = endIndex < spaces.length ? endIndex.toString() : undefined;

    return {
      data: paginatedSpaces,
      nextToken,
    };
  }, [client]);

  const onData = useCallback((data: RequestType[]) => {
    // Replace all spaces (since we're fetching all shared spaces each time)
    setSpaces(data.map(space => mapSpace(space, userUuid!)));
  }, [userUuid]);

  const { isLoading, hasNextPage, loadNextPage } = usePaginatedQuery<RequestType>({
    queryKey: ['spaces-shared-with-me', userUuid!, options?.key || 'default'],
    queryFn: (nextPageToken) => getSpaces(userUuid!, options?.perPage || 10, nextPageToken || ''),
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

const mapSpace = (space: RequestType, currentUserUuid: string | null) => {
  // Filter chats: in shared spaces (not owned by current user), only count current user's chats
  const isOwner = space.userUuid === currentUserUuid;
  const filteredChats = isOwner || !currentUserUuid
    ? space.chats || []
    : (space.chats || []).filter(chat => chat.userUuid === currentUserUuid);

  return {
    ...space,
    documentsCount: (space.documents?.length || 0) + (filteredChats.length || 0),
  } as Space;
};
