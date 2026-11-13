import { useAmplifyApiClient, useSessionContext } from "@/providers";
import { useCallback, useState } from "react";
import { v4 as uuidv4 } from 'uuid';

export const useCreateSpaceApi = () => {
  const client = useAmplifyApiClient();
  const { userAttributes } = useSessionContext();
  const [isCreatingSpace, setIsCreatingSpace] = useState(false);

  
  const createSpace = useCallback(async (name: string) => {
    if (!userAttributes?.userUuid) {
      throw new Error('User UUID is required');
    }

    setIsCreatingSpace(true);
    await client.models.Space.create({
      spaceUuid: uuidv4(),
      name,
      userUuid: userAttributes.userUuid,
    }, {
      selectionSet: ['spaceUuid', 'name', 'userUuid', 'updatedAt', 'createdAt', 'documents.documentUuid'],
    });
    setIsCreatingSpace(false);
  }, [userAttributes]);

  return { createSpace, isCreatingSpace };
}