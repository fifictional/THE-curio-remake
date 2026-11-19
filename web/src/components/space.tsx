import { Link, useRouter } from '@tanstack/react-router';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { useDeleteSpace, useRenameSpace } from '../api';
import type { Chat, DocumentRow, SessionUser, SpaceMember, SpaceRow } from '../types';
import { AuthCard } from './auth-card';

const LEVEL_LABEL = ['Owner', 'Can edit', 'Can view'];

/** Members of a folder: invite by email, change a level, remove. */
function SharePanel({
  spaceUuid,
  members,
  myLevel,
  onChanged,
}: {
  spaceUuid: string;
  members: SpaceMember[];
  myLevel: number | null;
  onChanged: () => void;
}) {
  const [email, setEmail] = useState('');
  const [level, setLevel] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canManage = myLevel !== null && myLevel <= 1;

  const invite = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/spaces/${spaceUuid}/members`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), level }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? `HTTP ${res.status}`);
      return;
    }
    setEmail('');
    onChanged();
  };

  const remove = async (userUuid: string) => {
    const res = await fetch(`/api/spaces/${spaceUuid}/members/${userUuid}`, { method: 'DELETE' });
    if (res.ok) onChanged();
  };

  return (
    <section className="mt-6 rounded-2xl border border-chat-panel-border bg-chat-panel p-4">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-headers">
        Shared with
      </h2>
      <p className="text-xs text-headers">
        Everyone here can open this folder. Viewers read; editors can add and edit documents.
      </p>

      <div className="mt-3 space-y-1">
        {members.map((member) => (
          <div
            key={member.userUuid}
            className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm"
          >
            <span className="min-w-0 flex-1 truncate">
              {member.name || member.email || 'Member'}
              {member.email && member.name ? (
                <span className="ml-1 text-xs text-headers">{member.email}</span>
              ) : null}
            </span>
            <span className="shrink-0 text-xs text-headers">{LEVEL_LABEL[member.level] ?? member.level}</span>
            {canManage && member.level !== 0 && (
              <button
                onClick={() => remove(member.userUuid)}
                className="shrink-0 text-xs text-headers underline hover:text-red-600"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {canManage && (
        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void invite();
          }}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@example.com"
            className="w-56 rounded-lg border border-black/10 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-curio-green/20"
          />
          <select
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            className="rounded-lg border border-black/10 bg-white px-2 py-1.5 text-sm"
          >
            <option value={1}>Can edit</option>
            <option value={2}>Can view</option>
          </select>
          <button
            type="submit"
            disabled={busy || !email.includes('@')}
            className="rounded-lg bg-curio-green px-3 py-1.5 text-sm text-white disabled:opacity-40"
          >
            {busy ? 'Inviting…' : 'Invite'}
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}

export function Space({
  user,
  space,
  chats,
  documents,
  members,
  myLevel,
}: {
  user: SessionUser | null;
  space: SpaceRow | null;
  chats: Chat[];
  documents: DocumentRow[];
  members: SpaceMember[];
  myLevel: number | null;
}) {
  const rename = useRenameSpace();
  const remove = useDeleteSpace();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(space?.name ?? '');
  const [confirming, setConfirming] = useState(false);
  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-6 pt-16">
        <AuthCard />
      </div>
    );
  }

  if (!space) {
    return (
      <div className="mx-auto w-full max-w-5xl px-6 py-6">
        <div className="rounded-2xl border border-chat-panel-border bg-chat-panel p-6">
          <h1 className="text-lg font-semibold text-foreground">Folder not found</h1>
          <p className="mt-1 text-sm text-headers">
            It may have been deleted, or it belongs to another account.
          </p>
          <Link to="/library" className="mt-4 inline-block text-sm underline">
            Back to the library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-6">
      <Link to="/library" className="text-xs text-headers underline">
        ← Library
      </Link>

      <div className="mt-1 flex flex-wrap items-center gap-2">
        {editing ? (
          <form
            className="flex items-center gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!name.trim()) return;
              await rename.mutateAsync({ spaceUuid: space.spaceUuid, name: name.trim() });
              setEditing(false);
              void router.invalidate();
            }}
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-black/10 bg-white px-2 py-1 text-lg outline-none focus:ring-2 focus:ring-curio-green/20"
            />
            <button type="submit" className="rounded-lg bg-curio-green px-3 py-1 text-xs text-white">
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setName(space.name ?? '');
              }}
              className="text-xs text-headers underline"
            >
              Cancel
            </button>
          </form>
        ) : (
          <>
            <h1 className="font-roca text-2xl text-foreground">
              {space.name || 'Untitled folder'}
            </h1>
            <button
              onClick={() => setEditing(true)}
              aria-label="Rename folder"
              className="text-headers hover:text-foreground"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </>
        )}

        <span className="ml-auto flex items-center gap-2">
          {confirming ? (
            <>
              <span className="text-xs text-headers">Delete this folder?</span>
              <button
                onClick={async () => {
                  await remove.mutateAsync(space.spaceUuid);
                  await router.navigate({ to: '/library' });
                  void router.invalidate();
                }}
                className="rounded-lg bg-red-600 px-3 py-1 text-xs text-white"
              >
                Delete
              </button>
              <button onClick={() => setConfirming(false)} className="text-xs underline">
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              aria-label="Delete folder"
              className="text-headers hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </span>
      </div>

      <p className="mt-1 text-xs text-headers">
        {chats.length} chat{chats.length === 1 ? '' : 's'} · {documents.length} document
        {documents.length === 1 ? '' : 's'}
        {' · '}
        documents are filed from the library
      </p>

      <SharePanel
        spaceUuid={space.spaceUuid}
        members={members}
        myLevel={myLevel}
        onChanged={() => void router.invalidate()}
      />

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-headers">
          Chats
        </h2>
        <div className="grid gap-2">
          {chats.map((chat) => (
            <Link
              key={chat.chatUuid}
              to="/"
              search={{ chat: chat.chatUuid }}
              className="flex items-center justify-between gap-4 rounded-xl border border-chat-panel-border bg-chat-panel px-4 py-3 hover:border-curio-green/40"
            >
              <span className="truncate text-sm text-foreground">
                {chat.name || 'Untitled chat'}
              </span>
              <span className="shrink-0 text-xs text-headers">Open →</span>
            </Link>
          ))}
          {chats.length === 0 && (
            <p className="rounded-xl border border-dashed border-chat-panel-border p-4 text-center text-sm text-headers">
              No chats in this folder yet.
            </p>
          )}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-headers">
          Documents
        </h2>
        <div className="grid gap-2">
          {documents.map((document) => (
            <Link
              key={document.documentUuid}
              to="/documents/$documentUuid"
              params={{ documentUuid: document.documentUuid }}
              className="flex items-center justify-between gap-4 rounded-xl border border-chat-panel-border bg-chat-panel px-4 py-3 hover:border-curio-green/40"
            >
              <span className="truncate text-sm text-foreground">
                {document.fileName || 'Untitled document'}
              </span>
              <span className="shrink-0 text-xs text-headers">Open →</span>
            </Link>
          ))}
          {documents.length === 0 && (
            <p className="rounded-xl border border-dashed border-chat-panel-border p-4 text-center text-sm text-headers">
              No documents in this folder yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
