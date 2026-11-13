import { useState } from 'react';
import {
  DEFAULT_CHAT,
  useAiChat,
  useMe,
  useMessages,
  useRagSearch,
  useSignIn,
  useSignOut,
  useSignUp,
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

function AuthCard() {
  const [email, setEmail] = useState('local@curio.test');
  const [password, setPassword] = useState('localpassword123');
  const [name, setName] = useState('Local User');
  const signIn = useSignIn();
  const signUp = useSignUp();
  const error = signIn.error ?? signUp.error;

  return (
    <div className="mx-auto mt-24 w-full max-w-md rounded-2xl border border-chat-panel-border bg-chat-panel p-6 shadow-sm">
      <h1 className="font-roca text-2xl text-foreground">Curio</h1>
      <p className="mt-1 text-sm text-muted-foreground">Sign in to continue learning.</p>

      <div className="mt-6 space-y-3">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
          className="w-full rounded-xl border border-chat-panel-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-curio-green/20"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          type="password"
          className="w-full rounded-xl border border-chat-panel-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-curio-green/20"
        />
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error.message}</p>}

      <button
        onClick={() => signIn.mutate({ email, password })}
        disabled={signIn.isPending}
        className="mt-4 w-full rounded-xl bg-curio-green px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {signIn.isPending ? 'Signing in…' : 'Sign in'}
      </button>

      <details className="mt-4 text-xs text-muted-foreground">
        <summary className="cursor-pointer">Create an account</summary>
        <div className="mt-2 space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="name"
            className="w-full rounded-xl border border-chat-panel-border bg-white px-3 py-2 text-sm"
          />
          <button
            onClick={() => signUp.mutate({ email, password, name })}
            disabled={signUp.isPending}
            className="w-full rounded-xl border border-chat-panel-border px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {signUp.isPending ? 'Creating…' : 'Sign up'}
          </button>
        </div>
      </details>

      <p className="mt-4 text-xs text-focus-text">
        Seeded login: local@curio.test / localpassword123
      </p>
    </div>
  );
}

function Chat() {
  const [chatUuid, setChatUuid] = useState(DEFAULT_CHAT);
  const [draft, setDraft] = useState('');
  const [question, setQuestion] = useState('');

  const messages = useMessages(chatUuid);
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
        </div>
        <div className="flex items-center gap-2">
          <input
            value={chatUuid}
            onChange={(e) => setChatUuid(e.target.value)}
            className="w-56 rounded-lg border border-chat-panel-border bg-chat-panel px-2 py-1 font-mono text-[11px] text-paragraphs"
          />
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

        <div className="space-y-3">
          {messages.data?.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div key={m.messageUuid} className={isUser ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={[
                    'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                    isUser
                      ? 'bg-active border border-curio-green/20 text-foreground'
                      : 'bg-white border border-chat-panel-border text-card-foreground',
                  ].join(' ')}
                >
                  {m.content}
                  <div className="mt-1 text-[10px] uppercase tracking-wide text-headers">
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
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
          Search this chat (Qdrant)
        </summary>
        <div className="mt-3 flex items-center gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Semantic search…"
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

export default function App() {
  const me = useMe();
  if (me.isLoading) {
    return <p className="p-10 text-sm text-headers">Checking session…</p>;
  }
  return me.data?.authenticated ? <Chat /> : <AuthCard />;
}
