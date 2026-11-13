import { useCallback, useState } from "react";
import { useAmplifyApiClient } from "@/providers";

export const useDeleteDocumentApi = () => {
  const client = useAmplifyApiClient();
  const [isDeletingDocument, setIsDeletingDocument] = useState(false);

  const deleteDocument = useCallback(async (id: string) => {
    setIsDeletingDocument(true);
    await client.queries.deleteDocument({
      documentUuid: id,
    });
    setIsDeletingDocument(false);
  }, [client]);

  return {
    deleteDocument,
    isDeletingDocument,
  }
}