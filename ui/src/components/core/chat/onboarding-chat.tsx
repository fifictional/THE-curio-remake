'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useAnalytics } from '@/providers';
import { Message } from '@/lib/types';
import { Messages } from './messages';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

type OnboardingChatProps = {
  messages: Message[];
}

export function OnboardingChat({ messages }: OnboardingChatProps) {
  const { track } = useAnalytics();
  const router = useRouter();
  const chatUuid = useMemo(() => uuidv4(), []);
  const messageContainerRef = useRef<HTMLDivElement>(null); 
  
  useEffect(() => {
    router.prefetch('/signup');
  }, [router]);
  

  const noOp = () => {
    // no-op
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastUserMessageRef = useRef<HTMLDivElement>(null);
  
  return (
    <div className="h-[calc(100%-10px)] flex flex-col overflow-y-auto">
      {/* Messages */}
      <Messages messageContainerRef={messageContainerRef} chatUuid={chatUuid} messages={messages} hasMoreMessages={false} loadMore={noOp} localTempMessage={null} waitingForResponse={false} messagesEndRef={messagesEndRef} lastUserMessageRef={lastUserMessageRef} />

      {/* No Input, but show Sign up button */}
      <div className="flex flex-col items-center justify-center">
        <Button
          onClick={() => {
            track('signup_clicked_from_chat');
            router.push('/signup');
          }}
        >Sign up to chat with Curio</Button>
      </div>
    </div>
  );
} 