import { useAmplifyApiClient } from "@/providers";
import { useCallback, useState } from "react";

export const useMoveChatApi = () => {
  const client = useAmplifyApiClient();
  const [isMovingChatToSpace, setIsMovingChatToSpace] = useState(false);

  
  const moveChatToSpace = useCallback(async (chatUuid: string, spaceUuid: string | null) => {
    setIsMovingChatToSpace(true);
    // Pass empty string for null to remove from folder (backend handles this)
    await client.mutations.moveChat({
      chatUuid,
      spaceUuid: spaceUuid || '',
    });

    setIsMovingChatToSpace(false);
  }, [client]);

  return {
    moveChatToSpace,
    isMovingChatToSpace,
  }
};