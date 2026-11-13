import { MockDocument } from "@/lib/types/mock-document";
import { useAmplifyApiClient } from "@/providers";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

export const useMockDocumentsApi = () => {
  const client = useAmplifyApiClient();

  const getMockDocuments = useCallback(async () => {
    const response = await client.models.MockDocument.list();
    return response.data as MockDocument[];
  }, []);

  const { data, isLoading } = useQuery<MockDocument[]>({
    queryKey: ['mockDocuments'],
    queryFn: getMockDocuments,
  });

  return {
    mockDocuments: data,
    isLoading,
  };
};
