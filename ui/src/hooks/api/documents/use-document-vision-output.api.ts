import { useAmplifyApiClient } from "@/providers";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StudentDocumentVisionOutput, StudentDocumentWithSummary } from "@/lib/types";
import { ByUserApiOptions, SubscriptionType } from "../types";
import { useSubscription } from "../use-subscription";
import { usePaginatedQuery } from "../use-paginated-query.api";
import { Schema } from "@amplify/data/resource";

type SelectionSetType = 'documentVisionOutputUuid' | 'documentUuid' | 'totalPages' | 'pageNumber' | 'bbox' | 'className' | 'confidence' | 'text' | 'caption';
const selectionSet: SelectionSetType[] = ['documentVisionOutputUuid', 'documentUuid', 'totalPages', 'pageNumber', 'bbox', 'className', 'confidence', 'text', 'caption'];

type RequestType = Pick<Schema["DocumentVisionOutput"]["type"], SelectionSetType>;

type SubscriptionInputType = {
  documentUuid: string | null;
}

export function useDocumentVisionOutputApi({ 
  documentUuid,
  options,
}: {
  documentUuid: string | null;
  options?: ByUserApiOptions;
}) {
  const client = useAmplifyApiClient();

  const [documentVisionOutputs, setDocumentVisionOutputs] = useState<StudentDocumentVisionOutput[]>([]);

  const createSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.DocumentVisionOutput.onCreate({
      filter: { documentUuid: { eq: input.documentUuid! } },
      selectionSet,
    }).subscribe({
      next: (data) => {
        // add element on top of the list, and remove the last if over the limit;
        setDocumentVisionOutputs([...documentVisionOutputs, mapDocumentVisionOutputToStudentDocumentExtractedContent(data)]);
      },
    });
  }, []);

  const onValidate = useCallback((input: SubscriptionInputType) => {
    return !!input.documentUuid;
  }, []);

  const subInput = useMemo(() => ({ documentUuid }), [documentUuid]);
  useSubscription<SubscriptionInputType>({
    subscriptions: 'create',
    input: subInput,
    onValidate,
    createFunc: createSubscription,
  });

  const getDocumentVisionOutputs = useCallback(async (documentUuid: string, perPage: number, pageToken: string) => {
    const response = await client.models.DocumentVisionOutput.listDocumentVisionOutputByDocumentUuid({
      documentUuid,
    }, {
      selectionSet,
      // use big limit to get all the data
      // and avoid pagination
      limit: 500,
    });

    return response;
  }, []);

  const onData = useCallback((data: RequestType[]) => {
    // add elements to prev, but remove the duplicates
    setDocumentVisionOutputs(data.map(mapDocumentVisionOutputToStudentDocumentExtractedContent));
  }, []);

  const { isLoading } = usePaginatedQuery<RequestType>({
    queryKey: ['document-vision-outputs', documentUuid!, options?.key || 'default', options?.perPage?.toString() || '10'],
    queryFn: (nextPageToken) => getDocumentVisionOutputs(documentUuid!, options?.perPage || 10, nextPageToken),
    options: {
      enabled: !!documentUuid,
      onData,
    },
  });

  return {
    isLoading,
    documentVisionOutputs,
  };
}

const mapDocumentVisionOutputToStudentDocumentExtractedContent = (item: RequestType) => ({
    documentExtractedContentUuid: item.documentVisionOutputUuid,
    documentUuid: item.documentUuid,
    documentType: item.className, // Using className as documentType
    subject: item.className, // Using className as subject
    sectionName: `Vision Output - Page ${item.pageNumber}`,
    pageRange: `${item.pageNumber}-${item.pageNumber}`,
    sectionSummary: `Vision detection: ${item.className} (confidence: ${item.confidence})`,
    sectionKeyConcepts: [item.className],
    sectionContent: [{
      bbox: JSON.parse(item.bbox), // Parse the bbox string to array
      content_type: "summary" as const,
      content_text: item.text || `${item.className} detected with ${item.confidence} confidence`,
      page_number: item.pageNumber.toString(),
      visual_element_type: item.className,
      image_name: `vision-output-${item.documentVisionOutputUuid}`,
      description: `Vision detection result: ${item.className}`,
      caption: item.caption || `Detected ${item.className} on page ${item.pageNumber}`,
    }],
  })
