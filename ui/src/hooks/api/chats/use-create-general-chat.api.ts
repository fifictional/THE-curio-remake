import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useAmplifyApiClient, useAnalytics, useSessionContext } from "@/providers";
import { useMutation } from "@tanstack/react-query";
import { v4 as uuidv4 } from 'uuid';

interface CreateGeneralChatApiProps {
  spaceUuid?: string | null;
}

interface ReferenceData {
  type: 'text';
  name: string;
  content: string;
}

interface OnChatStartedOptions {
  referenceData?: ReferenceData[];
  spaceDocumentUuids?: string[];
}

export function useCreateGeneralChatApi({ spaceUuid }: CreateGeneralChatApiProps) {
  const client = useAmplifyApiClient();
  const { userAttributes } = useSessionContext();
  const router = useRouter();
  const [hideExtras, setHideExtras] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const { track } = useAnalytics();
  
  const { mutateAsync: startNewChat } = useMutation({
    mutationFn: async ({ message, spaceUuid }: { message: string, spaceUuid: string | null }) => {
      const chatUuid = uuidv4();
      const chat = await client.models.Chat.create({
        userUuid: userAttributes!.userUuid,
        chatUuid,
        name: `${message.length > 20 ? message.slice(0, 20) + '...' : message}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        spaceUuid,
      });

      if (!chat.data) {
        throw new Error('Failed to create chat');
      }

      return {
        chat: chat.data,
      };
    },
  });

  const onChatStarted = useCallback(async (
    message: string, 
    options?: OnChatStartedOptions
  ) => {
    track('chat_started', { spaceUuid: spaceUuid || null });

    setHideExtras(true);
    setIsCreatingChat(true);
    
    try {
      const { chat } = await startNewChat({ message, spaceUuid: spaceUuid || null });
      if (!chat) {
        throw new Error('Failed to create chat');
      }

      // Build URL with query params
      const params = new URLSearchParams({
        message,
      });

      // Add referenceData if provided
      if (options?.referenceData) {
        params.set('referenceData', JSON.stringify(options.referenceData));
      }

      // Add spaceDocumentUuids if provided
      if (options?.spaceDocumentUuids && options.spaceDocumentUuids.length > 0) {
        params.set('spaceDocumentUuids', JSON.stringify(options.spaceDocumentUuids));
      }

      const url = spaceUuid 
        ? `/spaces/${spaceUuid}/chats/${chat.chatUuid}?${params.toString()}`
        : `/chats/${chat.chatUuid}?${params.toString()}`;

      router.push(url);
    } finally {
      setIsCreatingChat(false);
    }
  }, [router, spaceUuid, startNewChat, track]);

  return {
    onChatStarted,
    hideExtras,
    isCreatingChat,
  };
}