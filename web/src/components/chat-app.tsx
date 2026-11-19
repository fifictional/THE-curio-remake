import { useNavigate } from '@tanstack/react-router';
import { ArrowUp, Plus } from 'lucide-react';
import { useRef, useState } from 'react';

import { AuthCard } from './auth-card';
import { FloatingNav } from './app-shell';
import { Markdown } from '../lib/markdown';
import type { CitationRow, Message, SessionUser } from '../types';
import {
  useAiChat,
  useCitations,
  useCreateChat,
  useMe,
  useMessages,
  useRagSearch,
} from '../api';

/**
 * Chat surface, ported from the original layout: greeting when there is no
 * conversation, message column + sources panel when there is one, and a
 * rounded composer with the upload affordance at the bottom.
 */

function Sources({ chatUuid, initial }: { chatUuid: string; initial: CitationRow[] }) {
  const citations = useCitations(chatUuid, initial);

  return (
    <aside className="hidden w-72 shrink-0 flex-col border-l border-black/5 px-4 py-5 xl:flex">
      <h2 className="text-sm font-semibold text-headers">Sources</h2>
      <p className="mt-1 text-[11px] text-headers">Documents Curio used in this conversation.</p>

      <div className="mt-3 space-y-2 overflow-y-auto">
        {(citations.data ?? []).map((citation) => (
          <a
            key={citation.chatCitationUuid}
            href={citation.url}
            className="block rounded-xl border border-black/5 bg-chat-panel px-3 py-2 hover:border-curio-green/40"
          >
            <span className="block truncate text-sm text-foreground">{citation.title}</span>
            <span className="text-[11px] text-headers">
              {citation.type === 'document' ? 'Your document' : citation.type}
            </span>
          </a>
        ))}
        {(citations.data ?? []).length === 0 && (
          <p className="text-sm text-headers">
            No sources yet. Ask something about your documents and they will show up here.
          </p>
        )}
      </div>
    </aside>
  );
}

function Composer({
  onSend,
  pending,
  autoFocus,
}: {
  onSend: (text: string) => void;
  pending?: boolean;
  autoFocus?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const input = useRef<HTMLInputElement>(null);

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
          ref={input}
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

/** The home screen before a conversation exists — the product's greeting. */
function Greeting({ firstName }: { firstName: string | null }) {
  const createChat = useCreateChat();
  const aiChat = useAiChat('');
  const navigate = useNavigate();

  const start = async (text: string) => {
    const created = await createChat.mutateAsync();
    if (!created) return;
    // Send after the chat exists, then land on it (same order as the user expects).
    await aiChat.mutateAsync({ chatUuid: created, message: text }).catch(() => {});
    await navigate({ to: '/', search: { chat: created } });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-28">
      <h1 className="text-center font-sans text-3xl font-semibold text-foreground">
        Hi {firstName ?? 'there'} 👋
      </h1>
      <h2 className="mt-6 max-w-xl text-center text-4xl font-bold leading-tight text-headers">
        What <span className="text-foreground">curio</span>sity do you want to explore today?
      </h2>

      <div className="mt-10 w-full max-w-2xl">
        <Composer onSend={start} pending={createChat.isPending || aiChat.isPending} autoFocus />
      </div>

      <div className="fixed inset-x-0 bottom-6 flex justify-center">
        <FloatingNav />
      </div>
    </div>
  );
}

function ChatView({
  chatUuid,
  initialMessages,
  initialCitations,
}: {
  chatUuid: string;
  initialMessages: Message[];
  initialCitations: CitationRow[];
}) {
  const messages = useMessages(chatUuid, initialMessages);
  const aiChat = useAiChat(chatUuid);
  const [question, setQuestion] = useState('');
  const rag = useRagSearch(chatUuid);

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto w-full max-w-3xl space-y-6">
            {messages.isLoading && <p className="text-sm text-headers">Loading…</p>}
            {messages.data?.length === 0 && (
              <p className="text-sm text-headers">No messages in this chat yet.</p>
            )}

            {messages.data?.map((m) => {
              const isUser = m.role === 'user';
              const time = new Date(m.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

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

            {aiChat.isPending && <p className="text-sm text-headers">Curio is thinking…</p>}
            {aiChat.error && <p className="text-sm text-red-600">{(aiChat.error as Error).message}</p>}
            {aiChat.data?.mock && (
              <p className="text-[11px] text-focus-text">
                Mock reply — set OPENAI_API_KEY in .env for a real model.
              </p>
            )}

            <details className="rounded-xl border border-black/5 px-3 py-2 text-xs text-headers">
              <summary className="cursor-pointer">Search sources</summary>
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Search your documents…"
                  className="flex-1 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm"
                />
                <button
                  onClick={() => rag.mutate(question)}
                  disabled={rag.isPending || !question.trim()}
                  className="rounded-lg border border-black/10 px-3 py-1.5 text-sm disabled:opacity-40"
                >
                  Search
                </button>
              </div>
              <div className="mt-2 space-y-1">
                {rag.data?.hits.map((hit) => (
                  <div key={hit.messageUuid} className="rounded-lg bg-white px-2 py-1.5">
                    <span className="text-[10px] text-headers">score {hit.score.toFixed(3)}</span>
                    <p className="text-paragraphs">{hit.text}</p>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </div>

        <div className="px-6 pb-5">
          <Composer
            onSend={(text) => aiChat.mutate({ message: text })}
            pending={aiChat.isPending}
          />
        </div>
      </div>

      <Sources chatUuid={chatUuid} initial={initialCitations} />
    </div>
  );
}

export default function App({
  initial,
}: {
  initial: {
    user: SessionUser | null;
    firstName: string | null;
    chatUuid: string | null;
    messages: Message[];
    citations: CitationRow[];
  };
}) {
  const me = useMe(initial.user);

  if (me.isLoading) {
    return <p className="p-10 text-sm text-headers">Checking session…</p>;
  }
  if (!me.data?.authenticated) return <AuthCard />;

  return initial.chatUuid ? (
    <ChatView
      chatUuid={initial.chatUuid}
      initialMessages={initial.messages}
      initialCitations={initial.citations}
    />
  ) : (
    <Greeting firstName={initial.firstName} />
  );
}
