import { useState } from 'react';

import { AuthCard } from './auth-card';
import { Markdown } from '../lib/markdown';
import type { Message, SessionUser } from '../types';
import {
  DEFAULT_CHAT,
  useAiChat,
  useMe,
  useMessages,
  useRagSearch,
  useSignOut,
} from '../api';

/**
 * Chat surface.
 *
 * Styling uses the original Curio tokens (see src/index.css): chat panel
 * #FCFBFA, border #EAECF0, page background #F4F3ED, accent green #126310.
 * The original component tree lives in the old repo at
 * `src/components/core/chat/*` (chat.tsx 271 lines, message-ui.tsx 296) and is
 * the next thing to port — it needs its providers, markdown renderer and
 * framer-motion installed here.
 */

function Chat({
  initialChatUuid,
  initialMessages,
}: {
  initialChatUuid: string | null;
  initialMessages: Message[];
}) {
  const [chatUuid, setChatUuid] = useState(initialChatUuid ?? DEFAULT_CHAT);
  const [draft, setDraft] = useState('');
  const [question, setQuestion] = useState('');

  const messages = useMessages(chatUuid, chatUuid === initialChatUuid ? initialMessages : undefined);
  const aiChat = useAiChat(chatUuid);
  const rag = useRagSearch(chatUuid);
  const signOut = useSignOut();

  const send = () => {
    const text = draft.trim();
    if (!text || aiChat.isPending) return;
    setDraft('');
    aiChat.mutate(text);
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-8">
      <header className="flex items-center justify-between gap-3 py-5">
        <div className="flex items-baseline gap-3">
          <span className="font-roca text-xl text-foreground">Curio</span>
          <span className="text-xs text-headers">chat</span>
          <a href="/library" className="ml-2 text-sm text-headers underline hover:text-foreground">
            Library
          </a>
        </div>
        <div className="flex items-center gap-2">
          {import.meta.env.DEV && (
            <input
              value={chatUuid}
              onChange={(e) => setChatUuid(e.target.value)}
              title="chat uuid (dev only)"
              className="w-56 rounded-lg border border-chat-panel-border bg-chat-panel px-2 py-1 font-mono text-[11px] text-paragraphs"
            />
          )}
          <button
            onClick={() => messages.refetch()}
            className="rounded-lg border border-chat-panel-border bg-chat-panel px-2 py-1 text-xs text-paragraphs"
          >
            Reload
          </button>
          <button
            onClick={() => signOut.mutate()}
            className="rounded-lg border border-chat-panel-border bg-chat-panel px-2 py-1 text-xs text-paragraphs"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 rounded-2xl border border-chat-panel-border bg-chat-panel p-5">
        {messages.isLoading && <p className="text-sm text-headers">Loading…</p>}
        {messages.error && <p className="text-sm text-red-600">{messages.error.message}</p>}
        {messages.data?.length === 0 && (
          <p className="text-sm text-headers">No messages in this chat yet.</p>
        )}

        <div className="space-y-4">
          {messages.data?.map((m) => {
            const isUser = m.role === 'user';
            const time = new Date(m.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            // Legacy shape: the student's turn is a bubble on the right, the
            // tutor's turn is plain full-width text on the left.
            if (isUser) {
              return (
                <div key={m.messageUuid} className="flex flex-col items-end">
                  <div className="mr-2 mb-2 text-sm font-bold text-headers">You</div>
                  <div className="max-w-[80%] rounded-3xl rounded-br-none bg-neutral-500 px-4 py-2 text-white">
                    <Markdown content={m.content} />
                    <div className="mt-1 text-[10px] text-white/70">{time}</div>
                  </div>
                </div>
              );
            }

            return (
              <div key={m.messageUuid} className="flex flex-col items-start">
                <div className="w-full">
                  <Markdown content={m.content} />
                  <div className="mt-1 text-[10px] text-headers">{time}</div>
                </div>
              </div>
            );
          })}
        </div>

        {aiChat.isPending && (
          <p className="mt-3 text-sm text-headers">Curio is thinking…</p>
        )}
        {aiChat.error && <p className="mt-3 text-sm text-red-600">{aiChat.error.message}</p>}
        {aiChat.data?.mock && (
          <p className="mt-3 text-[11px] text-focus-text">
            Mock reply — set OPENAI_API_KEY in .env for a real model.
          </p>
        )}
      </main>

      <div className="mt-4 flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send();
          }}
          placeholder="Ask Curio anything…"
          className="flex-1 rounded-xl border border-chat-panel-border bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-curio-green/20"
        />
        <button
          onClick={send}
          disabled={aiChat.isPending || !draft.trim()}
          className="rounded-xl bg-curio-green px-5 py-3 text-sm font-medium text-white disabled:opacity-40"
        >
          Send
        </button>
      </div>

      <details className="mt-4 rounded-xl border border-chat-panel-border bg-chat-panel px-4 py-3">
        <summary className="cursor-pointer text-xs uppercase tracking-wide text-headers">
          Search sources (documents + chat)
        </summary>
        <div className="mt-3 flex items-center gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Search your documents…"
            className="flex-1 rounded-lg border border-chat-panel-border bg-white px-3 py-2 text-sm"
          />
          <button
            onClick={() => rag.mutate(question)}
            disabled={rag.isPending || !question.trim()}
            className="rounded-lg border border-chat-panel-border px-3 py-2 text-sm disabled:opacity-40"
          >
            Search
          </button>
        </div>
        {rag.error && <p className="mt-2 text-xs text-red-600">{rag.error.message}</p>}
        <div className="mt-3 space-y-2">
          {rag.data?.hits.map((h) => (
            <div key={h.messageUuid} className="rounded-lg bg-white px-3 py-2 text-xs">
              <span className="text-headers">score {h.score.toFixed(3)}</span>
              <p className="mt-1 text-paragraphs">{h.text}</p>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

/**
 * `initial` is the SSR loader's data: session, first chat and its messages. The
 * page is correct before any client JavaScript runs.
 */
export default function App({
  initial,
}: {
  initial: { user: SessionUser | null; chatUuid: string | null; messages: Message[] };
}) {
  const me = useMe(initial.user);

  if (me.isLoading) {
    return <p className="p-10 text-sm text-headers">Checking session…</p>;
  }
  if (!me.data?.authenticated) return <AuthCard />;

  return (
    <Chat initialChatUuid={initial.chatUuid} initialMessages={initial.messages} />
  );
}
