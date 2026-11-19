import { ArrowUp, Check, Copy, Layers, ListChecks, Plus } from 'lucide-react';
import { useState } from 'react';

import { Markdown } from '../lib/markdown';
import type { Message, ServerMessage } from '../types';

/** Server-rendered messages carry tool arguments as JSON text. */
export type ChatMessage = Message | ServerMessage;

function parseToolArgs(message: ChatMessage): Record<string, unknown> | null {
  if ('toolArgumentsJson' in message && message.toolArgumentsJson) {
    try {
      return JSON.parse(message.toolArgumentsJson) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  const args = (message as Message).toolArguments;
  return args && typeof args === 'object' ? (args as Record<string, unknown>) : null;
}

/** Composer + message bubble, shared by the main chat and the document chat. */

export function Composer({
  onSend,
  pending,
  autoFocus,
  onTool,
  onAttach,
}: {
  onSend: (text: string) => void;
  pending?: boolean;
  autoFocus?: boolean;
  /** Renders the flashcards/quiz shortcuts when the chat exists. */
  onTool?: (kind: 'flashcards' | 'quiz') => void;
  /** Attach a file to this chat; falls back to the library when absent. */
  onAttach?: (file: File) => void;
}) {
  const [draft, setDraft] = useState('');

  const submit = () => {
    const text = draft.trim();
    if (!text || pending) return;
    setDraft('');
    onSend(text);
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-curio-green/15">
        {onAttach ? (
          <label
            title="Attach a file"
            aria-label="Attach a file"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-500 hover:bg-black/5 hover:text-gray-800"
          >
            <Plus className="h-5 w-5" />
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onAttach(file);
                e.target.value = '';
              }}
            />
          </label>
        ) : (
          <button
            type="button"
            aria-label="Upload a document"
            title="Upload a document"
            onClick={() => {
              window.location.assign('/library');
            }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-black/5 hover:text-gray-800"
          >
            <Plus className="h-5 w-5" />
          </button>
        )}
        <input
          value={draft}
          autoFocus={autoFocus}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          placeholder="Ask anything…"
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-headers"
        />
        <button
          type="button"
          aria-label="Send"
          onClick={submit}
          disabled={!draft.trim() || pending}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-curio-green text-white disabled:opacity-30"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>

      {onTool && (
        <div className="mt-2 flex items-center gap-2 pl-1">
          <button
            onClick={() => onTool('flashcards')}
            disabled={pending}
            className="flex items-center gap-1 rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-paragraphs disabled:opacity-40"
          >
            <Layers className="h-3.5 w-3.5" />
            Flashcards
          </button>
          <button
            onClick={() => onTool('quiz')}
            disabled={pending}
            className="flex items-center gap-1 rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-paragraphs disabled:opacity-40"
          >
            <ListChecks className="h-3.5 w-3.5" />
            Quiz
          </button>
        </div>
      )}
    </div>
  );
}

/** The old app rendered tool results as cards; these are the two that survive. */
function ToolCard({ message }: { message: ChatMessage }) {
  const args = parseToolArgs(message);
  if (!args) return null;

  if (message.toolName === 'create_flashcard') {
    const cards = Array.isArray(args.flashcards) ? (args.flashcards as Array<{ title?: string; content?: string }>) : [];
    return (
      <div className="rounded-2xl border border-chat-panel-border bg-chat-panel p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-headers">
          Flashcards · {cards.length}
        </p>
        <div className="mt-2 space-y-1">
          {cards.map((card, index) => (
            <details key={index} className="rounded-lg border border-black/5 bg-white px-3 py-2">
              <summary className="cursor-pointer text-sm text-foreground">{card.title || 'Card'}</summary>
              <p className="mt-1 whitespace-pre-wrap text-sm text-paragraphs">{card.content}</p>
            </details>
          ))}
        </div>
      </div>
    );
  }

  if (message.toolName === 'create_quiz') {
    const quiz = (args.quiz ?? {}) as { title?: string; difficulty?: string; questionCount?: number };
    return (
      <div className="rounded-2xl border border-chat-panel-border bg-chat-panel p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-headers">Quiz</p>
        <p className="mt-1 text-sm text-foreground">{quiz.title || 'Untitled quiz'}</p>
        <p className="text-xs text-headers">
          {quiz.questionCount ?? 0} question{(quiz.questionCount ?? 0) === 1 ? '' : 's'}
          {quiz.difficulty ? ` · ${quiz.difficulty}` : ''}
        </p>
      </div>
    );
  }

  // create_mock_exam belongs to a dropped feature; render nothing.
  return null;
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false);

  if (message.type === 'tool') {
    return <ToolCard message={message} />;
  }

  const isUser = message.role === 'user';
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isUser) {
    return (
      <div className="flex flex-col items-end">
        <div className="mr-2 mb-2 text-sm font-bold text-headers">You</div>
        <div className="max-w-[80%] rounded-3xl rounded-br-none bg-neutral-500 px-4 py-2 text-white">
          <Markdown content={message.content} />
          <div className="mt-1 text-[10px] text-white/70">{time}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col items-start">
      <div className="w-full">
        <Markdown content={message.content} />
        <div className="mt-1 flex items-center gap-2 text-[10px] text-headers">
          <span>{time}</span>
          <button
            aria-label="Copy message"
            title="Copy message"
            onClick={async () => {
              await navigator.clipboard?.writeText(message.content);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="opacity-0 transition-opacity group-hover:opacity-100"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
