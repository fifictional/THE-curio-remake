import { Link, useNavigate } from '@tanstack/react-router';
import {
  FileText,
  HeartPlus,
  Info,
  Library,
  LogOut,
  MessageCircle,
  Plus,
  Settings,
} from 'lucide-react';

import { useSignOut } from '../api';
import type { Chat, DocumentRow, SessionUser, SpaceRow } from '../types';

/**
 * The frame around every screen, ported from the original sidebar: wordmark,
 * primary actions, folders, recents, and the account footer. The remake used to
 * render each page as a bare column, which is why it did not look like Curio.
 */

function initials(user: SessionUser | null) {
  const source = user?.name?.trim() || user?.email || '?';
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

function RecentRow({
  icon,
  label,
  to,
  params,
  search,
}: {
  icon: React.ReactNode;
  label: string;
  to: string;
  params?: Record<string, string>;
  search?: Record<string, string | undefined>;
}) {
  return (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- route paths are dynamic here
      to={to as any}
      params={params as any}
      search={search as any}
      className="flex items-center gap-2 truncate rounded-lg px-2 py-1.5 text-sm text-paragraphs hover:bg-black/[0.04] hover:text-foreground"
    >
      <span className="shrink-0 text-headers">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function AppShell({
  user,
  chats,
  documents,
  spaces,
  children,
}: {
  user: SessionUser | null;
  chats: Chat[];
  documents: DocumentRow[];
  spaces: SpaceRow[];
  children: React.ReactNode;
}) {
  const signOut = useSignOut();
  const navigate = useNavigate();

  // Signed out: auth screens own the page, no sidebar.
  if (!user) return <>{children}</>;

  const recents = [
    ...chats.map((chat) => ({
      kind: 'chat' as const,
      uuid: chat.chatUuid,
      label: chat.name || 'Untitled chat',
      at: (chat as { updatedAt?: string }).updatedAt ?? '',
    })),
    ...documents.map((doc) => ({
      kind: 'document' as const,
      uuid: doc.documentUuid,
      label: doc.fileName || 'Untitled document',
      at: doc.createdAt ?? '',
    })),
  ]
    .sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))
    .slice(0, 12);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-focus">
      <aside className="hidden w-[260px] shrink-0 flex-col bg-focus px-4 py-4 md:flex">
        <Link to="/" search={{ chat: undefined }} className="font-roca text-2xl leading-none text-foreground">
          curio.
        </Link>

        <nav className="mt-6 flex flex-col gap-3">
          <button
            onClick={() => navigate({ to: '/', search: { chat: undefined } })}
            className="flex items-center gap-2 text-left text-sm font-bold text-gray-600 transition-colors hover:text-gray-900"
          >
            <MessageCircle className="h-5 w-5" />
            New Chat
          </button>
          <Link
            to="/library"
            className="flex items-center gap-2 text-sm font-bold text-gray-600 transition-colors hover:text-gray-900"
          >
            <Library className="h-5 w-5" />
            Library
          </Link>
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLScx4u4uimLIbuWmCBll3i_n9dMZDk5ltlVRqFC6C8hRQT7V1Q/viewform?usp=dialog"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-sm font-bold text-gray-600 transition-colors hover:text-gray-900"
          >
            <HeartPlus className="h-5 w-5" />
            Feedback
          </a>
          <Link
            to="/settings"
            className="flex items-center gap-2 text-sm font-bold text-gray-600 transition-colors hover:text-gray-900"
          >
            <Info className="h-5 w-5" />
            Settings
          </Link>
        </nav>

        <div className="my-4 h-px bg-gray-300/60" />

        <div className="flex items-center justify-between">
          <span className="font-semibold text-headers">Your Library</span>
          <Link to="/library" className="text-xs text-headers underline">
            create a folder
          </Link>
        </div>
        <div className="mt-2 space-y-0.5">
          {spaces.length ? (
            spaces.map((space) => (
              <RecentRow
                key={space.spaceUuid}
                icon={<Library className="h-4 w-4" />}
                label={space.name || 'Untitled folder'}
                to="/spaces/$spaceId"
                params={{ spaceId: space.spaceUuid }}
              />
            ))
          ) : (
            <p className="px-2 py-1 text-xs text-headers">No folders found.</p>
          )}
        </div>

        <div className="mb-1 mt-5 font-semibold text-headers">Recents</div>
        <div className="-mx-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto">
          {recents.map((item) =>
            item.kind === 'chat' ? (
              <RecentRow
                key={`chat-${item.uuid}`}
                icon={<MessageCircle className="h-4 w-4" />}
                label={item.label}
                to="/"
                search={{ chat: item.uuid }}
              />
            ) : (
              <RecentRow
                key={`doc-${item.uuid}`}
                icon={<FileText className="h-4 w-4" />}
                label={item.label}
                to="/documents/$documentUuid"
                params={{ documentUuid: item.uuid }}
              />
            ),
          )}
          {recents.length === 0 && (
            <p className="px-2 py-1 text-xs text-headers">Nothing here yet.</p>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-black/5 pt-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-circle text-xs font-semibold text-foreground">
            {initials(user)}
          </span>
          <Link to="/profile" className="min-w-0 flex-1 truncate text-sm text-foreground">
            {user.name || user.email}
          </Link>
          <button
            onClick={() => signOut.mutate(undefined, { onSuccess: () => window.location.assign('/') })}
            title="Sign out"
            className="text-gray-500 hover:text-gray-800"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-tl-3xl bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between px-4 py-3 md:hidden">
          <Link to="/" search={{ chat: undefined }} className="font-roca text-xl">
            curio.
          </Link>
          <Link to="/library" className="text-sm text-paragraphs">
            Library
          </Link>
        </div>
        {children}
      </main>
    </div>
  );
}

/** Small helper for the floating nav under the greeting. */
export function FloatingNav({ onUpload }: { onUpload?: () => void }) {
  return (
    <div className="pointer-events-auto mx-auto flex w-fit items-center gap-1 rounded-full border border-black/10 bg-chat-panel px-2 py-2 shadow-lg">
      <Link
        to="/"
        search={{ chat: undefined }}
        className="flex items-center gap-2 rounded-full bg-foreground px-4 py-1.5 text-sm text-primary-foreground"
      >
        <Library className="h-4 w-4" />
        Home
      </Link>
      <button
        onClick={onUpload}
        className="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm text-paragraphs hover:text-foreground"
      >
        <Plus className="h-4 w-4" />
        Upload
      </button>
      <Link
        to="/library"
        className="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm text-paragraphs hover:text-foreground"
      >
        <FileText className="h-4 w-4" />
        Library
      </Link>
    </div>
  );
}

export { Settings };
