import { useAmplifyUserApiClient } from "@/providers";
import { useCallback, useMemo, useState } from "react";
import { StudentDocumentWithSummary } from "@/lib/types";
import { ByUserApiOptions } from "../types";
import { useSubscription } from "../use-subscription";
import { usePaginatedQuery } from "../use-paginated-query.api";
import { Schema } from "@amplify/data/resource";

type SelectionSetType = 'documentUuid' | 'userUuid' | 'spaceUuid' | 'type' | 'fileName' | 'key' | 'originalKey' | 'documentCount' | 'hasRagEmbeddings' | 'youtubeVideoUuid' | 'documentSummaries' | 'createdAt' | 'updatedAt' | 'space';
type SpaceSelectionSetType = 'name';
type DocumentSummarySelectionSetType = 'documentSummaryUuid' | 'tags';

const selectionSet = ['documentUuid', 'userUuid', 'spaceUuid', 'type', 'fileName', 'key', 'originalKey', 'documentCount', 'hasRagEmbeddings', 'youtubeVideoUuid', 'documentSummaries.documentSummaryUuid', 'documentSummaries.tags', 'createdAt', 'updatedAt', 'space.name'];

type RequestType = Pick<Schema['Document']['type'], SelectionSetType> & {
  space: Pick<Schema['Space']['type'], SpaceSelectionSetType>;
  documentSummaries: Pick<Schema['DocumentSummary']['type'], DocumentSummarySelectionSetType>[];
};

type SubscriptionInputType = {
  userUuid: string | null;
}

export function useDocumentsByUserApi({ 
  userUuid,
  options,
}: {
  userUuid: string | null;
  options?: ByUserApiOptions;
}) {
  const userClient = useAmplifyUserApiClient();

  const [documents, setDocuments] = useState<StudentDocumentWithSummary[]>([]);

  const createSubscription = useCallback((input: SubscriptionInputType) => {
    return userClient.models.Document.onCreate({
      filter: { userUuid: { eq: input.userUuid! } },
      selectionSet: selectionSet as any,
    }).subscribe({
      next: (data) => {
        // add element on top of the list, and remove the last if over the limit;
        const document = {
          ...data,
          spaceName: data.space?.name || 'No Folder',
          spaceUuid: data.spaceUuid || null,
        } as StudentDocumentWithSummary;

        if (documents.length >= (options?.perPage || 10)) {
          setDocuments((prev) => [document, ...prev.slice(0, (options?.perPage || 10) - 1)]);
        } else {
          setDocuments((prev) => [document, ...prev]);
        }
      },
    });
  }, [documents, options?.perPage, options?.key]);

  const updateSubscription = useCallback((input: SubscriptionInputType) => {
    return userClient.models.Document.onUpdate({
      filter: { userUuid: { eq: input.userUuid! } },
      selectionSet: selectionSet as any,
    }).subscribe({
      next: (data) => {
        if (!data) return;
        setDocuments((prev) => prev.map((document) => document.documentUuid === data.documentUuid ? {
          ...data,
          spaceName: data.space?.name || 'No Folder',
          spaceUuid: data.spaceUuid || null,
        } as StudentDocumentWithSummary : document));
      },
    });
  }, []);

  const deleteSubscription = useCallback((input: SubscriptionInputType) => {
    return userClient.models.Document.onDelete({
      filter: { userUuid: { eq: input.userUuid! } },
      selectionSet: selectionSet as any,
    }).subscribe({
      next: (data) => {
        if (!data) return;
        setDocuments((prev) => prev.filter((document) => document.documentUuid !== data.documentUuid));
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

  const getDocuments = useCallback(async (userUuid: string, perPage: number, pageToken: string) => {
    const response = await userClient.models.Document.listDocumentByUserUuidAndCreatedAt({
      userUuid,
    }, {
      selectionSet: selectionSet as any,
      limit: perPage,
      nextToken: !pageToken ? undefined : pageToken,
      sortDirection: "DESC"
    });

    return response;
  }, []);

  const onData = useCallback((data: RequestType[]) => {
    // add elements to prev, but remove the duplicates
    setDocuments(data.map((document) => ({
      ...document,
      spaceName: document.space?.name || 'No Folder',
      spaceUuid: document.spaceUuid || null,
    })) as unknown as StudentDocumentWithSummary[]);
  }, []);

  const { isLoading, loadNextPage, hasNextPage, refetch } = usePaginatedQuery<RequestType>({
    queryKey: ['documents', userUuid!, options?.key || 'default'],
    queryFn: (nextPageToken) => getDocuments(userUuid!, options?.perPage || 10, nextPageToken),
    options: {
      enabled: !!userUuid,
      onData
    },
  });

  const removeDocument = useCallback((documentUuid: string) => {
    setDocuments((prev) => prev.filter((document) => document.documentUuid !== documentUuid));
    refetch();
  }, []);

  return {
    isLoading,
    documents,
    hasNextPage,
    loadNextPage,
    removeDocument,
  };
}
