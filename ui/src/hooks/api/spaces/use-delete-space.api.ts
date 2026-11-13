import { useAmplifyApiClient, useSessionContext } from "@/providers";
import { useCallback, useState } from "react";

export const useDeleteSpaceApi = () => {
  const client = useAmplifyApiClient();
  const { userAttributes } = useSessionContext();
  const [isDeletingSpace, setIsDeletingSpace] = useState(false);

  
  const deleteSpace = useCallback(async (spaceUuid: string) => {
    setIsDeletingSpace(true);
    await client.models.Space.delete({
      spaceUuid,
    });
    setIsDeletingSpace(false);
  }, [userAttributes]);

  return { deleteSpace, isDeletingSpace };
}