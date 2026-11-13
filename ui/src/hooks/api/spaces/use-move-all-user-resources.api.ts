import { useAmplifyApiClient } from "@/providers";
import { useCallback } from "react";

export const useMoveAllUserResourcesApi = () => {
  const client = useAmplifyApiClient();

  const moveAllUserResources = useCallback(async (userUuid: string, spaceUuid: string) => {
    const response = await client.mutations.moveAllUserResources({
      userUuid,
      spaceUuid,
    });
    return response.data;
  }, [client]);

  return {
    moveAllUserResources,
  };
};
