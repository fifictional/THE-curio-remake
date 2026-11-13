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
} from './api';

function AuthCard() {
  const [email, setEmail] = useState('local@curio.test');
  const [password, setPassword] = useState('localpassword123');
  const [name, setName] = useState('Local User');
  const signIn = useSignIn();
  const signUp = useSignUp();

  return (
    <div className="card">
      <div className="row">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          type="password"
        />
      </div>
      <div className="row" style={{ marginTop: '.5rem' }}>
        <button onClick={() => signIn.mutate({ email, password })} disabled={signIn.isPending}>
          Sign in
        </button>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="name (sign-up)" />
        <button
          className="ghost"
          onClick={() => signUp.mutate({ email, password, name })}
          disabled={signUp.isPending}
        >
          Sign up
        </button>
      </div>
      {(signIn.error || signUp.error) && (
        <p className="err">{(signIn.error ?? signUp.error)!.message}</p>
      )}
      <p className="hint" style={{ marginBottom: 0 }}>
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
    if (!text) return;
    setDraft('');
    aiChat.mutate(text);
  };

  return (
    <>
      <div className="row" style={{ marginBottom: '1rem' }}>
        <input value={chatUuid} onChange={(e) => setChatUuid(e.target.value)} />
        <button
          className="ghost"
          onClick={() => messages.refetch()}
          disabled={messages.isFetching}
        >
          Reload
        </button>
        <button className="ghost" onClick={() => signOut.mutate()}>
          Sign out
        </button>
      </div>

      {messages.isLoading && <p className="hint">loading…</p>}
      {messages.error && <p className="err">{messages.error.message}</p>}
      {messages.data?.length === 0 && <p className="hint">no messages for this chat id</p>}

      {messages.data?.map((m) => (
        <div key={m.messageUuid} className={`msg ${m.role}`}>
          <div className="meta">
            {m.role} · {new Date(m.createdAt).toLocaleString()}
          </div>
          {m.content}
        </div>
      ))}

      {aiChat.isPending && <p className="hint">assistant is replying…</p>}
      {aiChat.error && <p className="err">{aiChat.error.message}</p>}

      <div className="row" style={{ marginTop: '1rem' }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send();
          }}
          placeholder="ask something…"
        />
        <button onClick={send} disabled={aiChat.isPending}>
          Send
        </button>
      </div>

      <h2>Search this chat (Qdrant)</h2>
      <div className="row">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="semantic search…"
        />
        <button
          className="ghost"
          onClick={() => rag.mutate(question)}
          disabled={rag.isPending || !question.trim()}
        >
          Search
        </button>
      </div>
      {rag.error && <p className="err">{rag.error.message}</p>}
      {rag.data?.hits.map((h) => (
        <div key={h.messageUuid} className={`msg ${h.role}`}>
          <div className="meta">score {h.score.toFixed(3)}</div>
          {h.text}
        </div>
      ))}
    </>
  );
}

export default function App() {
  const me = useMe();

  return (
    <div className="app">
      <h1>Curio</h1>
      <p className="sub">
        Hono + Postgres (RLS) + Better Auth + Qdrant — TanStack Query on the client.
      </p>
      {me.isLoading && <p className="hint">checking session…</p>}
      {me.data?.authenticated ? <Chat /> : <AuthCard />}
    </div>
  );
}
