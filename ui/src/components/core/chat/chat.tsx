'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAnalytics, useCommonContext, useSessionContext, useCoreContext } from '@/providers';
import { useSpaceContextSafe } from '@/providers/space-provider';
import { Message } from '@/lib/types';
import { Messages } from './messages';
import { GeneralChat } from '@/components/core/general-chat';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollToBottomButton } from '@/components/ui/scroll-to-bottom';

type ChatProps = {
  chatUuid: string | null;
  messages: Message[];
  chatPlaceholder?: string;
  noMessagesPlaceholder?: React.ReactNode;
  localTempMessage: { message: string, image?: string } | null;
  setLocalTempMessage: (message: { message: string, image?: string } | null) => void;
  isLoading: boolean;
  waitingForResponse: boolean;
  sendMessage: ({ message, image }: { message: string, image?: string }) => Promise<{ success: boolean, error?: string | null, errorCode?: number | null } | undefined>;
  hasMoreMessages: boolean;
  loadMore: () => void;
  showWebSearch: boolean;
  defaultWebSearchEnabled?: boolean;
  bubbleSuggestions?: Array<{ label: string; message: string; send?: boolean; disabled?: boolean; showPricingModal?: boolean }>;
  onSuggestionUsed?: (payload: { label: string; message: string; send: boolean; disabled?: boolean; showPricingModal?: boolean }) => void;
  isMockExamChat?: boolean;
  disabled?: boolean;
}

export function Chat({
  chatUuid,
  messages,
  chatPlaceholder,
  noMessagesPlaceholder,
  localTempMessage,
  setLocalTempMessage,
  isLoading,
  waitingForResponse,
  sendMessage,
  hasMoreMessages,
  loadMore,
  showWebSearch,
  defaultWebSearchEnabled,
  bubbleSuggestions,
  onSuggestionUsed,
  isMockExamChat,
  disabled,
}: ChatProps) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastUserMessageRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { track } = useAnalytics();
  const { hasReachedDailyLimit, hasReachedMinuteLimit, hasReachedDailyLimitForFreePremiumMessages } = useSessionContext();
  const { setIsRateLimitModalOpen, isMobile } = useCommonContext();
  const { document: contextDocument } = useCoreContext();
  
  // For document chats, only use the current document for references
  // For general chats in a space, use space references
  const spaceContext = useSpaceContextSafe();
  const spaceReferences = useMemo(() => {
    // If we have a context document, this is a document chat - don't use space references
    if (contextDocument) {
      return [];
    }
    // Otherwise, use space references if available
    return spaceContext?.references || [];
  }, [contextDocument, spaceContext]);
  const scrollUserMessageToTop = () => {
    if (lastUserMessageRef.current) {
      lastUserMessageRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  const [webSearchEnabled, setWebSearchEnabled] = useState(defaultWebSearchEnabled || false);

  const prevLocalTempMessageRef = useRef<{ message: string, image?: string } | null>(null);

  // Scroll when localTempMessage is replaced by the server message
  useEffect(() => {
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

    // Check if localTempMessage just got cleared (went from truthy to null/falsy)
    const localTempMessageCleared = prevLocalTempMessageRef.current && !localTempMessage;

    // If the temp message was just cleared and the last message is a user message,
    // it means the server message has arrived and replaced the local one
    if (localTempMessageCleared && lastMessage?.role === 'user') {
      // Small delay to let DOM fully render the server message
      if (messageContainerRef.current && messagesEndRef.current) {
        const containerRect = messageContainerRef.current.getBoundingClientRect()
        const endRect = messagesEndRef.current.getBoundingClientRect()
        const parentHeight = messageContainerRef.current.parentElement?.clientHeight || 0

        const calculatedHeight = endRect.top - containerRect.top
        messageContainerRef.current.style.minHeight = `${calculatedHeight + (parentHeight - 100)}px`
      }

      setTimeout(() => {
        scrollUserMessageToTop();
      }, 50);
    }

    // Update ref
    prevLocalTempMessageRef.current = localTempMessage;
  }, [localTempMessage, messages]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setError(null);

    e.preventDefault();
    if (!message.trim() || isLoading) return;

    if (hasReachedDailyLimit) {
      // open modal to show the pad plans
      setIsRateLimitModalOpen(true);
      return;
    }

    setMessage('');

    if (isMockExamChat) {
      track('mock-exam-chat-message-sent-from-chat', {
        message,
      });
    } else {
      track('chat-message-sent-from-chat', {
        message,
      });
    }

    setLocalTempMessage({ message });
    const response = await sendMessage({ message });

    // Refocus the textarea after sending - use setTimeout to ensure it happens after React's render cycle
    // Disabled auto focus for the mobile as it causes the keyboard to pop up which is not a good experience
    if (!isMobile) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }

    if (response?.success) {
      return;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (message.trim()) {
        const form = e.currentTarget.form;
        if (form) {
          const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
          form.dispatchEvent(submitEvent);
        }
      }
    }
  };

  useEffect(() => {
    // when we get an update from the server, we need to clear the local temp message
    setLocalTempMessage(null);
  }, [messages]);

  const handleSuggestionClick = useCallback(async (sugg: { label: string; message: string; send?: boolean; disabled?: boolean; showPricingModal?: boolean }) => {
    const label = sugg.label;
    const finalMessage = sugg.message;
    const shouldSend = sugg.send ?? true;

    onSuggestionUsed?.({ label, message: finalMessage, send: shouldSend, disabled: sugg.disabled ?? false, showPricingModal: sugg.showPricingModal ?? false });

    if (!disabled) {
      // If the suggestion should be sent immediately, don't set it in the input
      // The parent's onSuggestionUsed will handle sending the message
      if (!shouldSend) {
        setMessage(finalMessage);
      }
    }
  }, [onSuggestionUsed, disabled]);

  // Memoize the messages to prevent unnecessary re-renders
  // re-rendering the messages is very expensive as they have all
  // the context from markdown and mathjax
  const MemoMessages = useMemo(() => {
    return (
      <Messages
        noMessagesPlaceholder={noMessagesPlaceholder}
        chatUuid={chatUuid}
        messages={messages}
        hasMoreMessages={hasMoreMessages}
        loadMore={loadMore}
        localTempMessage={localTempMessage}
        waitingForResponse={waitingForResponse}
        messagesEndRef={messagesEndRef}
        lastUserMessageRef={lastUserMessageRef}
        messageContainerRef={messageContainerRef}
      />
    );
  }, [messages, hasMoreMessages, loadMore, localTempMessage, waitingForResponse, messagesEndRef, lastUserMessageRef, noMessagesPlaceholder]);

  return (
    <div className="flex flex-col w-full h-full relative">
      {/* Messages */}
      <div className="flex-1 overflow-y-scroll mb-4" ref={chatRef}>
        {MemoMessages}
      </div>

      {/* Bubble Suggestions */}
      {bubbleSuggestions && bubbleSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {bubbleSuggestions.map((suggestion, idx) => {
            const label = typeof suggestion === 'string' ? suggestion : suggestion.label;
            // Only show as locked if disabled AND not using the new showPricingModal approach
            const isLocked = suggestion.disabled && !suggestion.showPricingModal;
            return (
              <motion.button
                type="button"
                key={`${label}-${idx}`}
                onClick={() => handleSuggestionClick(suggestion)}
                initial={{ opacity: 0, scale: 0.97, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.15, type: 'spring', stiffness: 360, damping: 26, mass: 0.7 }}
                className={cn("bg-gray-700 rounded-full px-4 py-2 cursor-pointer text-white",
                  "font-medium hover:bg-gray-600 active:scale-[0.98] flex items-center gap-2",
                  "disabled:bg-gray-300 disabled:cursor-not-allowed",
                  isLocked && "bg-gray-300 cursor-not-allowed hover:bg-gray-300"
                )}
                disabled={isLoading}
              >
                {isLocked && <Lock className="w-4 h-4" />}
                {label}
              </motion.button>
            );
          })}
        </div>
      )}

      {
        messages.length > 0 &&  <ScrollToBottomButton containerRef={chatRef}></ScrollToBottomButton>
      }

      <div className="mt-auto">
        {/* Input */}
        <GeneralChat
          // Controlled mode props
          message={message}
          setMessage={setMessage}
          handleSubmit={handleSubmit}
          handleKeyDown={handleKeyDown}
          textareaRef={textareaRef}
          // Common props
          placeholder={chatPlaceholder}
          disabled={disabled || waitingForResponse || hasReachedMinuteLimit}
          showPlusButton={false}
          referencesPosition="top"
          references={spaceReferences}
          // Error and loading states
          error={error}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
} 