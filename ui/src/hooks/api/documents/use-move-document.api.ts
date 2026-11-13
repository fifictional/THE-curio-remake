import { useAmplifyApiClient } from "@/providers";
import { useCallback, useState } from "react";

export const useMoveDocumentApi = () => {
  const client = useAmplifyApiClient();
  const [isMovingDocumentToSpace, setIsMovingDocumentToSpace] = useState(false);

  
  const moveDocumentToSpace = useCallback(async (documentUuid: string, spaceUuid: string | null) => {
    setIsMovingDocumentToSpace(true);
    // Pass empty string for null to remove from folder (backend handles this)
    await client.mutations.moveDocument({
      documentUuid,
      spaceUuid: spaceUuid || '',
    });

    setIsMovingDocumentToSpace(false);
  }, [client]);

  return {
    moveDocumentToSpace,
    isMovingDocumentToSpace,
  }
};