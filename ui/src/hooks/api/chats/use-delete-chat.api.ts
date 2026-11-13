import { useCallback, useState } from "react";
import { useAmplifyApiClient } from "@/providers";

export const useDeleteChatApi = () => {
  const client = useAmplifyApiClient();
  const [isDeletingChat, setIsDeletingChat] = useState(false);

  const deleteChat = useCallback(async (id: string) => {
    setIsDeletingChat(true);
    await client.queries.deleteChat({
      chatUuid: id,
    });
    setIsDeletingChat(false);
  }, [client]);

  return {
    deleteChat,
    isDeletingChat,
  }
}