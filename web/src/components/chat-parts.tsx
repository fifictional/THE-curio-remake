import { ArrowUp, Plus } from 'lucide-react';
import { useState } from 'react';

import { Markdown } from '../lib/markdown';
import type { Message } from '../types';

/** Composer + message bubble, shared by the main chat and the document chat. */

export function Composer({
  onSend,
  pending,
  autoFocus,
}: {
  onSend: (text: string) => void;
  pending?: boolean;
  autoFocus?: boolean;
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
    </div>
  );
}

export function MessageBubble({ message }: { message: Message }) {
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
    <div className="flex flex-col items-start">
      <div className="w-full">
        <Markdown content={message.content} />
        <div className="mt-1 text-[10px] text-headers">{time}</div>
      </div>
    </div>
  );
}
