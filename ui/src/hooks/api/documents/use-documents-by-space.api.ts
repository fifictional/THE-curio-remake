import { useAmplifyUserApiClient } from "@/providers";
import { useCallback, useMemo, useState } from "react";
import { StudentDocumentWithSummary } from "@/lib/types";
import { ByUserApiOptions } from "../types";
import { useSubscription } from "../use-subscription";
import { usePaginatedQuery } from "../use-paginated-query.api";
import { Schema } from "@amplify/data/resource";

type SelectionSetType = 'documentUuid' | 'userUuid' | 'spaceUuid' | 'type' | 'fileName' | 'key' | 'originalKey' | 'documentCount' | 'hasRagEmbeddings' | 'youtubeVideoUuid' | 'documentSummaries' | 'documentSummaries' | 'createdAt' | 'updatedAt' | 'space';
type SpaceSelectionSetType = 'name';
type DocumentSummarySelectionSetType = 'documentSummaryUuid' | 'tags';

const selectionSet = ['documentUuid', 'userUuid', 'spaceUuid', 'type', 'fileName', 'key', 'originalKey', 'documentCount', 'hasRagEmbeddings', 'youtubeVideoUuid', 'documentSummaries.documentSummaryUuid', 'documentSummaries.tags', 'createdAt', 'updatedAt', 'space.name'];

type RequestType = Pick<Schema['Document']['type'], SelectionSetType> & {
  space: Pick<Schema['Space']['type'], SpaceSelectionSetType>;
  documentSummaries: Pick<Schema['DocumentSummary']['type'], DocumentSummarySelectionSetType>[];
};

type SubscriptionInputType = {
  spaceUuid: string | null;
}

export function useDocumentsBySpaceApi({ 
  spaceUuid,
  options,
}: {
  spaceUuid: string | null;
  options?: ByUserApiOptions;
}) {
  const client = useAmplifyUserApiClient();

  const [documents, setDocuments] = useState<StudentDocumentWithSummary[]>([]);

  const createSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.Document.onCreate({
      filter: { spaceUuid: { eq: input.spaceUuid! } },
      selectionSet: selectionSet as any,
    }).subscribe({
      next: (data) => {
        // add element on top of the list, and remove the last if over the limit;
        const document = {
          ...data,
          spaceName: data.space?.name || 'No Folder',
          spaceUuid: data.spaceUuid || null,
        } as StudentDocumentWithSummary;

        setDocuments((prev) => [document, ...prev]);
      },
    });
  }, []);

  const updateSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.Document.onUpdate({
      filter: { spaceUuid: { eq: input.spaceUuid! } },
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
    return client.models.Document.onDelete({
      filter: { spaceUuid: { eq: input.spaceUuid! } },
      selectionSet: selectionSet as any,
    }).subscribe({
      next: (data) => {
        if (!data) return;
        setDocuments((prev) => prev.filter((document) => document.documentUuid !== data.documentUuid));
      },
    });
  }, []);

  const onValidate = useCallback((input: SubscriptionInputType) => {
    return !!input.spaceUuid;
  }, []);

  const subInput = useMemo(() => ({ spaceUuid }), [spaceUuid]);
  useSubscription<SubscriptionInputType>({
    subscriptions: options?.subscriptions || 'none',
    input: subInput,
    onValidate,
    createFunc: createSubscription,
    updateFunc: updateSubscription,
    deleteFunc: deleteSubscription,
  });

  const getDocuments = useCallback(async (spaceUuid: string, perPage: number, pageToken: string) => {
    const response = await client.models.Document.listDocumentBySpaceUuidAndCreatedAt({
      spaceUuid,
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

  const { isLoading, loadNextPage, refetch, hasNextPage } = usePaginatedQuery<RequestType>({
    queryKey: ['documents', spaceUuid!, options?.key || 'default', options?.perPage?.toString() || '10'],
    queryFn: (nextPageToken) => getDocuments(spaceUuid!, options?.perPage || 10, nextPageToken),
    options: {
      enabled: !!spaceUuid,
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
