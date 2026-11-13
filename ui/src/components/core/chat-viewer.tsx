'use client';

import { useChatContext, useCommonContext, useCoreContext, useSessionContext } from '@/providers';
import { Chat } from './chat';
import { useChatByIdApi } from '@/hooks/api/chats/use-chat-by-id.api';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { CoreActionsTabs, Features } from './core-actions-tabs';

export function ChatViewer() {
  const { waitingFor } = useCoreContext();
  const { isMobile } = useCommonContext();
  const { chatUuid, chat } = useChatContext();
  const params = useSearchParams();
  const defaultWebSearchEnabled = params.get('webSearchEnabled') === 'true';
  const { hasReachedDailyLimitForWebSearch } = useSessionContext();

  // Parse spaceDocumentUuids from query params
  const spaceDocumentUuids = useMemo(() => {
    const uuidsParam = params.get('spaceDocumentUuids');
    if (!uuidsParam) return undefined;
    try {
      return JSON.parse(uuidsParam) as string[];
    } catch {
      return undefined;
    }
  }, [params]);

  const features = useMemo<Features[]>(() => {
    let f: Features[] = ['main-chat'];
    if (chat?.isWebSearchCalled) {
      f.push('sources');
    }
    if (chat?.hasFlashcardsOrQuizzes) {
      f.push('flashcards', 'quiz');
    }
    return f;
  }, [chat]);
  
  const { isLoading: isChatsLoading, messages, localTempMessage, 
    setLocalTempMessage, sendMessage, hasMoreMessages, loadMore, isLoadingMessages } 
    = useChatByIdApi(
      { 
        chatUuid: chatUuid || null,
        chatType: 'main',
        chatArgs: {
          chatUuid: chatUuid || '',
          webSearch: defaultWebSearchEnabled && !hasReachedDailyLimitForWebSearch,
          spaceDocumentUuids,
        }
      });

  // On first load, if there is a message in query and no messages exist yet, send it
  useEffect(() => {
    const q = params.get('message');
    if (!q) return;
    if ((messages?.length || 0) > 0 || localTempMessage) return;
    if (isLoadingMessages) return;
    if (!chatUuid) return;
    sendMessage({ message: q });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, messages, chatUuid]);
  
  if(!isMobile) {
    return (
      <Chat 
        chatUuid={chatUuid}
        messages={messages}
        localTempMessage={localTempMessage || null}
        setLocalTempMessage={setLocalTempMessage || (() => {})}
        sendMessage={sendMessage}
        isLoading={isChatsLoading}
        waitingForResponse={waitingFor === 'chat'}
        hasMoreMessages={hasMoreMessages}
        loadMore={loadMore}
        showWebSearch={false}
        defaultWebSearchEnabled={defaultWebSearchEnabled}
      />
    );
  }

  return (
    <CoreActionsTabs defaultTab='main-chat' features={features} loadingTabs={[]} />
  );
} 