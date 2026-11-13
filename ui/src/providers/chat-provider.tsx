'use client';

import { useChatByIdApi } from '@/hooks/api/chats/use-chat-by-id.api';
import { useParams } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import { Chat } from '@/lib/types';

interface ChatContextValue {
  chatUuid: string | null;
  chat: Chat | null;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}
  
export function ChatProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { chatUuid } = useParams();
  const { chat } = useChatByIdApi({
    chatUuid: chatUuid as string,
    loadMessages: false,
    chatType: 'main',
    chatArgs: {
      chatUuid: chatUuid as string,
    },
  });

  return (
    <ChatContext.Provider value={{
      chatUuid: chatUuid as string,
      chat: chat,
    }}>
      {children}
    </ChatContext.Provider>
  );
} 