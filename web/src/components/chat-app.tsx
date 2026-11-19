import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { AuthCard } from './auth-card';
import { FloatingNav } from './app-shell';
import { Composer, MessageBubble } from './chat-parts';
import type { CitationRow, Message, SessionUser, SpaceRow } from '../types';
import {
  useAiChat,
  useCitations,
  useCreateChat,
  useDeleteChat,
  useMe,
  useMessages,
  useMoveChat,
  useRagSearch,
  useRenameChat,
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
              {citation.type === 'document'
                ? 'Your document'
                : citation.type === 'url_citation' || citation.type === 'web'
                  ? 'Web source'
                  : citation.type}
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

/** The home screen before a conversation exists — the product's greeting. */
function Greeting({ firstName }: { firstName: string | null }) {
  const createChat = useCreateChat();
  const aiChat = useAiChat('');
  const navigate = useNavigate();

  const start = async (text: string) => {
    const created = await createChat.mutateAsync({});
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

function ChatHeader({
  chatUuid,
  name,
  spaceUuid,
  spaces,
}: {
  chatUuid: string;
  name: string | null;
  spaceUuid: string | null;
  spaces: SpaceRow[];
}) {
  const rename = useRenameChat();
  const move = useMoveChat();
  const remove = useDeleteChat();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name ?? '');
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex items-center gap-2 border-b border-black/5 px-6 py-3">
      {editing ? (
        <form
          className="flex items-center gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            await rename.mutateAsync({ chatUuid, name: draft.trim() });
            setEditing(false);
          }}
        >
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="rounded-lg border border-black/10 bg-white px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-curio-green/20"
          />
          <button type="submit" className="text-xs underline">
            Save
          </button>
        </form>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="truncate text-sm font-medium text-foreground"
          title="Rename chat"
        >
          {name || 'Untitled chat'}
        </button>
      )}

      <label className="ml-auto flex items-center gap-1 text-xs text-headers">
        <span>Folder</span>
        <select
          value={spaceUuid ?? ''}
          onChange={(e) => move.mutate({ chatUuid, spaceUuid: e.target.value || null })}
          className="rounded-lg border border-black/10 bg-white px-2 py-1 text-xs text-foreground"
        >
          <option value="">None</option>
          {spaces.map((space) => (
            <option key={space.spaceUuid} value={space.spaceUuid}>
              {space.name || 'Untitled folder'}
            </option>
          ))}
        </select>
      </label>

      {confirming ? (
        <>
          <button
            onClick={async () => {
              await remove.mutateAsync(chatUuid);
              await navigate({ to: '/', search: { chat: undefined } });
            }}
            className="rounded-lg bg-red-600 px-2 py-1 text-xs text-white"
          >
            Delete chat
          </button>
          <button onClick={() => setConfirming(false)} className="text-xs underline">
            Cancel
          </button>
        </>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          title="Delete chat"
          className="text-xs text-headers underline hover:text-red-600"
        >
          Delete
        </button>
      )}
    </div>
  );
}

function ChatView({
  chatUuid,
  userSub,
  initialMessages,
  initialCitations,
  chatName,
  chatSpaceUuid,
  spaces,
}: {
  chatUuid: string;
  userSub: string;
  initialMessages: Message[];
  initialCitations: CitationRow[];
  chatName: string | null;
  chatSpaceUuid: string | null;
  spaces: SpaceRow[];
}) {
  const messages = useMessages(chatUuid, initialMessages);
  const aiChat = useAiChat(chatUuid);
  const [question, setQuestion] = useState('');
  const [toolError, setToolError] = useState<string | null>(null);
  const rag = useRagSearch(chatUuid);

  /** Persist a tool result as a message, so the card survives a reload. */
  const postToolMessage = async (
    toolName: 'create_flashcard' | 'create_quiz',
    toolArguments: Record<string, unknown>,
  ) => {
    await fetch('/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chatUuid,
        role: 'assistant',
        type: 'tool',
        toolName,
        toolArguments,
        content: toolName === 'create_flashcard' ? 'Flashcards created' : 'Quiz created',
      }),
    });
    await messages.refetch();
  };

  const generate = async (kind: 'flashcards' | 'quiz') => {
    setToolError(null);
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind, chatUuid, count: kind === 'flashcards' ? 8 : 5 }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      flashcards?: Array<{ title: string; content: string }>;
      quiz?: { title?: string; difficulty?: string; questionCount?: number };
    };

    if (!res.ok) {
      setToolError(body.error ?? `HTTP ${res.status}`);
      return;
    }

    if (kind === 'flashcards') {
      await postToolMessage('create_flashcard', { flashcards: body.flashcards ?? [] });
    } else {
      await postToolMessage('create_quiz', { quiz: body.quiz ?? {} });
    }
  };

  const attach = async (file: File) => {
    const extension = file.name.includes('.') ? `.${file.name.split('.').pop()}` : '';
    const key = `student-documents/${userSub}/chat/${chatUuid}/${crypto.randomUUID()}${extension}`;
    const upload = await fetch(`/files?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      body: file,
    });
    if (!upload.ok) {
      setToolError(`Upload failed (${upload.status})`);
      return;
    }

    const url = `/files?key=${encodeURIComponent(key)}`;
    const isImage = (file.type || '').startsWith('image/');
    const markdown = isImage ? `![${file.name}](${url})` : `[${file.name}](${url})`;

    await fetch('/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chatUuid, role: 'user', content: markdown }),
    });
    await messages.refetch();
  };

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <ChatHeader
          chatUuid={chatUuid}
          name={chatName}
          spaceUuid={chatSpaceUuid}
          spaces={spaces}
        />
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto w-full max-w-3xl space-y-6">
            {messages.isLoading && <p className="text-sm text-headers">Loading…</p>}
            {messages.data?.length === 0 && (
              <p className="text-sm text-headers">No messages in this chat yet.</p>
            )}

            {messages.data?.map((m) => <MessageBubble key={m.messageUuid} message={m} />)}

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
          {toolError && (
            <p className="mx-auto mb-2 w-full max-w-3xl text-xs text-red-600">{toolError}</p>
          )}
          <Composer
            onSend={(text) => aiChat.mutate({ message: text })}
            pending={aiChat.isPending}
            onTool={(kind) => void generate(kind)}
            onAttach={(file) => void attach(file)}
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
    chatName: string | null;
    chatSpaceUuid: string | null;
    spaces: SpaceRow[];
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
      userSub={initial.user?.sub ?? ''}
      initialMessages={initial.messages}
      initialCitations={initial.citations}
      chatName={initial.chatName}
      chatSpaceUuid={initial.chatSpaceUuid}
      spaces={initial.spaces}
    />
  ) : (
    <Greeting firstName={initial.firstName} />
  );
}
