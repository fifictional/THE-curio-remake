'use client';

import { ChatViewer } from '@/components/core/chat-viewer';
import { useChatContext, useCommonContext } from '@/providers';
import { useEffect } from 'react';
import { useHasResourceAccess } from '@/hooks/use-has-resource-access';
import { AccessDenied } from '@/design-system/access-denied';
import { CurioLoading } from '@/components/ui/curio-loading';
import { useChatByIdApi } from '@/hooks/api/chats/use-chat-by-id.api';
import { useParams } from 'next/navigation';
import { CurioLoadingWithSearch } from '@/components/ui/curio-loading-search';
import { useLoadingMessage } from '@/hooks/use-loading-message';

export default function ChatPage() {
  const params = useParams();
  const chatUuid = params.chatUuid as string;
  const { chat: contextChat } = useChatContext();
  const { chat, isLoading: isChatLoading } = useChatByIdApi({
    chatUuid,
    loadMessages: false,
    chatType: 'main',
    chatArgs: {
      chatUuid,
    },
  });
  const chatToCheck = chat || contextChat;
  const { hasAccess, isLoading: isAccessLoading } = useHasResourceAccess(chatToCheck);
  const { message } = useLoadingMessage();

  const { openRightPanel, closeRightPanel, collapseSidebar, uncollapseSidebar } = useCommonContext();
  
  useEffect(() => {
    if (hasAccess && chatToCheck && (chatToCheck.isWebSearchCalled || chatToCheck.hasFlashcardsOrQuizzes)) {
      openRightPanel({ features: ['sources', 'flashcards', 'quiz'] });
      collapseSidebar();
    }
    return () => {
      closeRightPanel();
      uncollapseSidebar();
    }
  }, [chatToCheck, hasAccess, openRightPanel, closeRightPanel, collapseSidebar, uncollapseSidebar]);

  if (isChatLoading || isAccessLoading || !chatToCheck) {
    return (
      <div className="flex items-center justify-center h-screen">
        <CurioLoadingWithSearch message={message} />
      </div>
    );
  }

  if (!hasAccess) {
    return <AccessDenied />;
  }

  return <div className="py-4 h-full max-w-5xl mx-auto">
    <ChatViewer />
  </div>
} 