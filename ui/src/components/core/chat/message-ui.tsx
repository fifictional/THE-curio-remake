import { cn } from "@/lib/utils";
import { CurioMarkdown } from "../curio-markdown";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, useCallback } from "react";
import { useAmplifyApiClient, useAnalytics } from "@/providers";
import { VoteToggle } from "@/components/ui/vote-toggle";
import { MessageToolExtra } from "@/lib/types/message";
import { CreateMockExamCard } from "./tools/create-mock-exam-card";
import { MockExamToolArguments } from "@/lib/types/mock-exam";
import { TypingIndicator } from "./typing-indicator";
import { CreateFlashcardsCard } from "./tools/create-flashcards-card";
import { CreateQuizCard } from "./tools/create-quiz-card";
import { GeneratedImageCard } from "./tools/generated-image-card";

type Props = {
  uuid: string;
  chatUuid: string | null;
  message: string;
  role: 'user' | 'assistant';
  image?: string;
  messageUuid?: string;
  currentVote?: 'up' | 'down' | null;
  type?: 'text' | 'tool';
  toolName?: string;
  toolArguments?: any;
  toolExtras?: MessageToolExtra;
  isCompleted?: boolean;
  agentStatus?: 'thinking' | 'understanding' | 'generating' | 'searching_web' | null;
  agentStatusMessage?: string | null;
}

export function MessageUI({
  uuid, 
  chatUuid,
  message, 
  role, 
  image, 
  type, 
  toolName, 
  toolArguments, 
  toolExtras,
  messageUuid,
  currentVote = null,
  isCompleted = false,
  agentStatus,
  agentStatusMessage,
}: Props) {
  const prefersReducedMotion = useReducedMotion();
  const isUser = role === 'user';
  const isAssistant = role === 'assistant';
  const client = useAmplifyApiClient();
  const { track } = useAnalytics();
  const [vote, setVote] = useState<'up' | 'down' | null>(currentVote);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleVote = useCallback(async (direction: 'up' | 'down') => {
    if (!isAssistant || !messageUuid || isUpdating) return;
    setIsUpdating(true);
    const previousVote = vote;
    const nextVote: 'up' | 'down' | null = previousVote === direction ? null : direction;
    setVote(nextVote);
    try {
      await client.models.Message.update({
        messageUuid,
        vote: nextVote as any,
      } as any);
      const eventName = nextVote === null
        ? 'chat-vote-clear'
        : nextVote === 'up' ? 'chat-vote-up' : 'chat-vote-down';
      track(eventName, {
        messageUuid,
        previousVote,
        newVote: nextVote,
        source: 'chat-message',
      });
    } catch (error) {
      setVote(previousVote);
      track('chat-vote-error', {
        messageUuid,
        previousVote,
        attemptedVote: direction,
        source: 'chat-message',
        error: (error as Error)?.message || String(error),
      });
    } finally {
      setIsUpdating(false);
    }
  }, [client.models.Message, isAssistant, messageUuid, isUpdating, vote, track]);

  // Smoothly reveal assistant streaming deltas
  const [renderedAssistantMessage, setRenderedAssistantMessage] = useState(message);
  const lastFullMessageRef = useRef(message);
  const animFrameRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);
  // Optional highlight range from external events (e.g., citations)
  const [highlightRange, setHighlightRange] = useState<{ start: number; end: number } | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onHighlight(e: Event) {
      const detail = (e as CustomEvent).detail as { startIndex?: number; endIndex?: number; messageUuid?: string };
      if (detail?.messageUuid && detail.messageUuid !== (messageUuid || uuid)) return;
      if (typeof detail?.startIndex === 'number' && typeof detail?.endIndex === 'number') {
        setHighlightRange({ start: Math.max(0, detail.startIndex), end: Math.max(detail.startIndex, detail.endIndex) });
      }
    }
    window.addEventListener('chat-highlight', onHighlight as EventListener);
    return () => window.removeEventListener('chat-highlight', onHighlight as EventListener);
  }, []);

  // When highlight is applied, scroll the first mark into view
  useEffect(() => {
    if (!isAssistant || !highlightRange) return;
    const el = contentRef.current?.querySelector('mark');
    if (el && 'scrollIntoView' in el) {
      (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightRange, isAssistant]);

  useEffect(() => {
    if (!isAssistant) return; // user handled by motion bubble

    const prev = lastFullMessageRef.current || '';
    const next = message || '';

    if (next === prev) return; // nothing to animate

    if (prefersReducedMotion) {
      lastFullMessageRef.current = next;
      setRenderedAssistantMessage(next);
      return;
    }

    // Find common prefix; animate typing only the new suffix
    let i = 0;
    const minLen = Math.min(prev.length, next.length);
    while (i < minLen && prev.charCodeAt(i) === next.charCodeAt(i)) i++;
    const commonPrefix = next.slice(0, i);
    const newSuffix = next.slice(i);

    // Start from current rendered (fallback to prev if new mount)
    setRenderedAssistantMessage(commonPrefix);
    lastFullMessageRef.current = next;

    // Cancel prior animation
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    isAnimatingRef.current = true;

    const chars = Array.from(newSuffix);
    let idx = 0;
    const step = () => {
      if (idx >= chars.length) {
        isAnimatingRef.current = false;
        setRenderedAssistantMessage(commonPrefix + newSuffix);
        return;
      }
      // Batch a few characters per frame for speed on large deltas
      const batch = 2;
      const end = Math.min(idx + batch, chars.length);
      const chunk = chars.slice(idx, end).join('');
      idx = end;
      setRenderedAssistantMessage(current => current + chunk);
      animFrameRef.current = requestAnimationFrame(step);
    };
    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [message, isAssistant, prefersReducedMotion]);

  // Show typing indicator only if there's no message content yet
  if (isAssistant && !isCompleted && (!message || message.trim() === '')) {
    return (
      <div className="flex flex-col gap-2" data-testid="agent-loading">
        {!agentStatusMessage && <TypingIndicator />}
        {agentStatusMessage && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <span className="text-sm text-gray-600 animate-shimmer" data-testid="agent-status-message">
                {agentStatusMessage}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (<div
    className={cn(
      "flex w-full message-item",
      role === 'assistant' ? "justify-start message-assistant" : "justify-end message-user",
      ""
    )}
    data-testid={role === 'user' ? 'message-user' : 'message-assistant'}
    data-message-uuid={uuid}
  >
    <div className={cn(
      "flex flex-col w-full",
      role === 'assistant' ? "items-start" : "items-end"
    )}>
      {role === 'user' && (
        <div className="text-sm text-gray-500 mr-2 mb-2 font-bold">
          You
        </div>
      )}
      {isUser ? (
        <motion.div
          className={cn(
            "rounded-3xl py-2",
            "bg-neutral-500 text-white rounded-br-none max-w-[80%] px-4"
          )}
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 6 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 360, damping: 26, mass: 0.7 }}
        >
          <div>
            <CurioMarkdown content={message} />
          </div>
          {image && (
            <div className="mt-2">
              <img 
                src={image} 
                alt="Message attachment" 
                className="rounded-md max-h-48 object-contain"
              />
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1, y: 6 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 360, damping: 26, mass: 0.7 }}
          className={cn(
            "rounded-3xl py-2",
            "text-gray-900 rounded-tl-none w-full"
          )}
        >
          <div ref={contentRef}>
          {message && (
            <CurioMarkdown content={isAssistant ? renderedAssistantMessage : message} highlightRange={isAssistant ? highlightRange : undefined} />
          )}
          {/* handle tools here */}
          {type === 'tool' && toolName === 'create_mock_exam' && (
            <CreateMockExamCard
              mockExam={JSON.parse(toolArguments)}
              toolExtras={toolExtras}
              chatUuid={chatUuid}
              messageUuid={uuid}
            />
          )}
          {type === 'tool' && toolName === 'create_flashcard' && (
            <CreateFlashcardsCard 
              messageUuid={uuid} 
              flashcards={JSON.parse(toolArguments)} 
              toolExtras={toolExtras} 
            />
          )}
          {type === 'tool' && toolName === 'create_quiz' && chatUuid && (
            <CreateQuizCard 
              messageUuid={uuid} 
              chatUuid={chatUuid} 
              quiz={JSON.parse(toolArguments)} 
              toolExtras={toolExtras} 
            />
          )}
          {type === 'tool' && toolName === 'generate_image' && toolArguments && (
            <GeneratedImageCard 
              toolArguments={toolArguments}
            />
          )}
          </div>
          {image && (
            <div className="mt-2">
              <img 
                src={image} 
                alt="Message attachment" 
                className="rounded-md max-h-48 object-contain"
              />
            </div>
          )}
          {/* reply vote controls */}
          {uuid && isCompleted && <VoteToggle
            className="mt-2 w-full"
            value={vote}
            disabled={isUpdating}
            variant="icon"
            align="right"
            onUpClick={() => handleVote('up')}
            onDownClick={() => handleVote('down')}
          />}
        </motion.div>
      )}
    </div>
  </div>)
}