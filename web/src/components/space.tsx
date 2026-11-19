import { Link } from '@tanstack/react-router';

import type { Chat, DocumentRow, SessionUser, SpaceRow } from '../types';
import { AuthCard } from './auth-card';

export function Space({
  user,
  space,
  chats,
  documents,
}: {
  user: SessionUser | null;
  space: SpaceRow | null;
  chats: Chat[];
  documents: DocumentRow[];
}) {
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
      <h1 className="mt-1 font-roca text-2xl text-foreground">{space.name || 'Untitled folder'}</h1>
      <p className="mt-1 text-xs text-headers">
        {chats.length} chat{chats.length === 1 ? '' : 's'} · {documents.length} document
        {documents.length === 1 ? '' : 's'}
      </p>

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
