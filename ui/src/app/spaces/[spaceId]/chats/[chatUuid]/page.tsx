'use client';

import { ChatViewer } from '@/components/core/chat-viewer';
import { useChatContext, useCommonContext } from '@/providers';
import { useEffect } from 'react';

export default function SpacePage() {
  const { chat } = useChatContext();

  const { openRightPanel, closeRightPanel, collapseSidebar, uncollapseSidebar } = useCommonContext();
  useEffect(() => {
    if (chat?.isWebSearchCalled || chat?.hasFlashcardsOrQuizzes) {
      openRightPanel({ features: ['sources', 'flashcards', 'quiz'] });
      collapseSidebar();
    }
    return () => {
      closeRightPanel();
      uncollapseSidebar();
    }
  }, [chat]);

  return <div className="py-4 h-full max-w-5xl mx-auto">
    <ChatViewer />
  </div>
} 