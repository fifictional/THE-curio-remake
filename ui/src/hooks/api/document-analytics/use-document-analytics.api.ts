import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAmplifyApiClient } from '@/providers/amplify-provider';

export interface Metadata {
  metadataUuid: string;
  targetUuid: string;
  targetType: string;
  name: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentAnalytics {
  documentUuid: string;
  uploadTime?: string | null;
  summaryFirstStreamedTime?: string | null;
  datalabCompletedTime?: string | null;
  flashcardGenerationCompletedTime?: string | null;
  embeddingCompletedTime?: string | null;
  categorisationCompletedTime?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UseDocumentAnalyticsOptions {
  startDate: Date;
  endDate: Date;
}

/**
 * Transform Metadata entries into DocumentAnalytics format
 * Groups metadata by targetId (documentUuid) and extracts values by name
 */
function transformMetadataToAnalytics(metadataEntries: Metadata[]): DocumentAnalytics[] {
  // Group metadata by targetId (documentUuid)
  const grouped = new Map<string, Partial<DocumentAnalytics>>();

  metadataEntries.forEach((entry) => {
    const documentUuid = entry.targetUuid;
    if (!grouped.has(documentUuid)) {
      grouped.set(documentUuid, {
        documentUuid,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      });
    }

    const analytics = grouped.get(documentUuid)!;
    
    // Map metadata names to analytics fields
    switch (entry.name) {
      case 'uploadTime':
        analytics.uploadTime = entry.value;
        break;
      case 'summaryFirstStreamedTime':
        analytics.summaryFirstStreamedTime = entry.value;
        break;
      case 'datalabCompletedTime':
        analytics.datalabCompletedTime = entry.value;
        break;
      case 'flashcardGenerationCompletedTime':
        analytics.flashcardGenerationCompletedTime = entry.value;
        break;
      case 'embeddingCompletedTime':
        analytics.embeddingCompletedTime = entry.value;
        break;
      case 'categorisationCompletedTime':
        analytics.categorisationCompletedTime = entry.value;
        break;
    }
  });

  return Array.from(grouped.values()) as DocumentAnalytics[];
}

export function useDocumentAnalyticsApi(options: UseDocumentAnalyticsOptions) {
  const client = useAmplifyApiClient();

  const getDocumentAnalytics = useCallback(async () => {
    const allEntries: Metadata[] = [];
    let nextToken: string | undefined = undefined;

    // Get all metadata entries for documents (we'll filter by uploadTime after transformation)
    do {
      const response: any = await client.models.Metadata.listMetadataByTargetTypeAndCreatedAt({
        targetType: 'document',
        createdAt: { between: [
          options.startDate.toISOString(),
          options.endDate.toISOString(),
        ]},
      }, {
        limit: 1000,
        nextToken,
      });

      if (response.data) {
        allEntries.push(...(response.data as Metadata[]));
      }

      nextToken = response.nextToken;
    } while (nextToken);

    // Transform Metadata entries into DocumentAnalytics format
    const analytics = transformMetadataToAnalytics(allEntries);
    console.log('analytics', analytics);
    return analytics;
  }, [client, options.startDate, options.endDate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['document-analytics', options.startDate, options.endDate],
    queryFn: getDocumentAnalytics,
  });

  return {
    data: data || [],
    isLoading,
    error,
  };
}

