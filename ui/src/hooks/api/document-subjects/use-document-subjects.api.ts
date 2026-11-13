import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAmplifyUserApiClient } from '@/providers/amplify-provider';

type DocumentWithMetadata = {
  documentUuid: string;
  userUuid: string;
  subjectId: string | null;
  documentType: string | null;
  createdAt: string;
};

interface UseDocumentSubjectsOptions {
  startDate: Date;
  endDate: Date;
}

export function useDocumentSubjectsApi(options: UseDocumentSubjectsOptions) {
  const client = useAmplifyUserApiClient();

  const getDocumentSubjects = useCallback(async () => {
    const documents: DocumentWithMetadata[] = [];
    let nextToken: string | undefined = undefined;

    // Get all documents in the date range
    do {
      const response: any = await client.models.Document.list({
        filter: {
          createdAt: {
            between: [
              options.startDate.toISOString(),
              options.endDate.toISOString(),
            ],
          },
        },
        limit: 1000,
        nextToken,
        selectionSet: ['documentUuid', 'userUuid', 'subjectId', 'createdAt'],
      });

      if (response.data) {
        documents.push(...response.data.map((doc: any) => ({
          documentUuid: doc.documentUuid,
          userUuid: doc.userUuid,
          subjectId: doc.subjectId || null,
          documentType: null, // Will be populated from metadata
          createdAt: doc.createdAt,
        })));
      }

      nextToken = response.nextToken ?? undefined;
    } while (nextToken);

    // Get documentType metadata for all documents
    // Fetch all documentType metadata entries for our documents
    const documentUuidSet = new Set(documents.map(d => d.documentUuid));
    const metadataMap = new Map<string, { value: string; createdAt: string }>();
    
    // Get all documentType metadata entries for documents
    // Note: We fetch all documentType metadata and filter by our documentUuids
    // since metadata createdAt may differ from document createdAt
    let metadataNextToken: string | undefined = undefined;
    
    do {
      const metadataResponse: any = await client.models.Metadata.list({
        filter: {
          targetType: { eq: 'document' },
          name: { eq: 'documentType' },
        },
        limit: 1000,
        nextToken: metadataNextToken,
        selectionSet: ['targetUuid', 'name', 'value', 'createdAt'],
      });

      if (metadataResponse.data) {
        // Only process metadata for documents we care about
        metadataResponse.data.forEach((entry: any) => {
          if (documentUuidSet.has(entry.targetUuid)) {
            // Keep the most recent documentType for each document
            const existing = metadataMap.get(entry.targetUuid);
            if (!existing || new Date(entry.createdAt) > new Date(existing.createdAt)) {
              metadataMap.set(entry.targetUuid, {
                value: entry.value,
                createdAt: entry.createdAt,
              });
            }
          }
        });
      }

      metadataNextToken = metadataResponse.nextToken ?? undefined;
    } while (metadataNextToken);

    // Combine documents with their documentType metadata
    return documents.map(doc => ({
      ...doc,
      documentType: metadataMap.get(doc.documentUuid)?.value || null,
    }));
  }, [client, options.startDate, options.endDate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['document-subjects', options.startDate, options.endDate],
    queryFn: getDocumentSubjects,
  });

  return {
    data: data || [],
    isLoading,
    error,
  };
}
