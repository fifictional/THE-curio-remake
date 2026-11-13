import { useAmplifyApiClient } from "@/providers";
import { useItemApi } from "../use-item.api";
import { Space } from "@/lib/types";

export function useSpaceApi(spaceUuid: string | null) {
  const client = useAmplifyApiClient();

  const { data, isLoading } = useItemApi<Space>(spaceUuid, {
    key: 'space',
    getItemFunc: async (itemUuid) => {
      const response = await client.models.Space.get({ spaceUuid: itemUuid }, {
        selectionSet: ['spaceUuid', 'name', 'userUuid', 'documents.documentUuid', 'updatedAt', 'createdAt'],
      });

      return {
        data: {
          ...response.data,
          documentsCount: response.data?.documents?.length || 0,
        } as Space,
      };
    },
  });

  return {
    space: spaceUuid ? data : null,
    isLoading,
  };
}
