import { useAmplifyApiClient } from "@/providers";
import { useCallback, useMemo, useState } from "react";
import { StudentDocumentSummary } from "@/lib/types";
import { ByUserApiOptions } from "../types";
import { useSubscription } from "../use-subscription";
import { usePaginatedQuery } from "../use-paginated-query.api";
import { Schema } from "@amplify/data/resource";

type SelectionSetType = 'documentSummaryUuid' | 'documentUuid' | 'title' | 'summary' | 'tags' | 'keyConcepts' | 'vote' | 'status';
const selectionSet = ['documentSummaryUuid', 'documentUuid', 'title', 'summary', 'tags', 'keyConcepts', 'vote', 'status'];
type RequestType = Pick<Schema['DocumentSummary']['type'], SelectionSetType>;

type SubscriptionInputType = {
  documentUuid: string | null;
}

export function useDocumentSummaryApi({ 
  documentUuid,
  options,
}: {
  documentUuid: string | null;
  options?: ByUserApiOptions;
}) {
  const client = useAmplifyApiClient();
  const [documentSummary, setDocumentSummary] = useState<StudentDocumentSummary | null>(null);

  const createSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.DocumentSummary.onCreate({
      filter: { documentUuid: { eq: input.documentUuid! } },
      selectionSet: selectionSet as any,
    }).subscribe({
      next: (data) => {
        setDocumentSummary({
          documentUuid: data.documentUuid,
          documentSummaryUuid: data.documentSummaryUuid,
          title: data.title,
          summary: data.summary,
          tags: data.tags,
          keyConcepts: data.keyConcepts,
          vote: (data as any).vote ?? null,
          status: (data as any).status ?? null,
        });
      },
    });
  }, [client]);

  const updateSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.DocumentSummary.onUpdate({
      filter: { documentUuid: { eq: input.documentUuid! } },
      selectionSet: selectionSet as any,
    }).subscribe({
      next: (data) => {
        setDocumentSummary({
          documentUuid: data.documentUuid,
          documentSummaryUuid: data.documentSummaryUuid,
          title: data.title,
          summary: data.summary,
          tags: data.tags,
          keyConcepts: data.keyConcepts,
          vote: (data as any).vote ?? null,
          status: (data as any).status ?? null,
        });
      },
    });
  }, [client]);

  const onValidate = useCallback((input: SubscriptionInputType) => {
    return !!input.documentUuid;
  }, []);

  const subInput = useMemo(() => ({ documentUuid }), [documentUuid]);
  useSubscription<SubscriptionInputType>({
    subscriptions: 'create-update',
    input: subInput,
    onValidate,
    createFunc: createSubscription,
    updateFunc: updateSubscription,
  });

  const getDocumentSummary = useCallback(async (documentUuid: string) => {
    const response = await client.models.DocumentSummary.listDocumentSummaryByDocumentUuid({
      documentUuid,
    }, {
      selectionSet: selectionSet as any,
      limit: 1,
    });

    return response;
  }, []);

  const onData = useCallback((data: RequestType[]) => {
    // add elements to prev, but remove the duplicates
    setDocumentSummary({
      ...data[0],
      vote: (data[0] as any)?.vote ?? null,
      status: (data[0] as any)?.status ?? null,
    } as any);
  }, []);

  const { isLoading } = usePaginatedQuery<RequestType>({
    queryKey: ['document-summary', documentUuid!, options?.key || 'default'],
    queryFn: () => getDocumentSummary(documentUuid!),
    options: {
      enabled: !!documentUuid,
      onData,
    },
  });

  return {
    isLoading,
    documentSummary,
  };
}
