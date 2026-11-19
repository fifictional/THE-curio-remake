import { useState } from 'react';

import { useSignOut } from '../api';
import { AccountDangerZone } from './account-danger';
import type { MemoryState, ProfileRow, SessionUser } from '../types';
import { AuthCard } from './auth-card';

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-6 border-b border-black/5 py-3 last:border-0">
      <span className="text-sm text-headers">{label}</span>
      <span className="text-right text-sm text-foreground">{value || '—'}</span>
    </div>
  );
}

/**
 * What Curio remembers: the migrated blocks, the global switch, export and
 * delete. Creating new blocks needs a model, so this page does not pretend to.
 */
function MemoryPanel({ initial }: { initial: MemoryState }) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [blocks, setBlocks] = useState(initial.blocks);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    const next = !enabled;
    setBusy(true);
    const res = await fetch('/api/account/memory', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: next }),
    });
    setBusy(false);
    if (res.ok) setEnabled(next);
  };

  const clear = async () => {
    setBusy(true);
    const res = await fetch('/api/account/memory', { method: 'DELETE' });
    setBusy(false);
    if (res.ok) {
      setBlocks([]);
      setConfirming(false);
    }
  };

  const gaps = blocks.filter((block) => block.blockType === 'knowledge_gap');
  const mastered = blocks.filter((block) => block.blockType === 'mastered_topic');

  return (
    <section className="mt-4 rounded-2xl border border-chat-panel-border bg-chat-panel p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-headers">Memory</h2>
          <p className="mt-1 text-sm text-headers">
            Topics Curio noticed you find hard or have mastered. Turning it off keeps what is
            here; nothing new is recorded.
          </p>
        </div>
        <button
          onClick={() => void toggle()}
          disabled={busy}
          aria-pressed={enabled}
          className={[
            'relative h-7 w-12 shrink-0 rounded-full transition-colors',
            enabled ? 'bg-curio-green' : 'bg-black/15',
          ].join(' ')}
        >
          <span
            className={[
              'absolute top-1 h-5 w-5 rounded-full bg-white transition-all',
              enabled ? 'left-6' : 'left-1',
            ].join(' ')}
          />
          <span className="sr-only">{enabled ? 'Turn memory off' : 'Turn memory on'}</span>
        </button>
      </div>

      <p className="mt-3 text-xs text-headers">
        {blocks.length} block{blocks.length === 1 ? '' : 's'} · {gaps.length} knowledge gap
        {gaps.length === 1 ? '' : 's'} · {mastered.length} mastered topic
        {mastered.length === 1 ? '' : 's'}
      </p>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {[
          { title: 'Knowledge gaps', items: gaps },
          { title: 'Mastered topics', items: mastered },
        ].map((group) => (
          <div key={group.title}>
            <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
            <div className="mt-2 space-y-1">
              {group.items.slice(0, 8).map((block) => (
                <div
                  key={block.memoryBlockUuid}
                  className="rounded-lg border border-black/5 bg-white px-3 py-2"
                >
                  <p className="text-sm text-foreground">{block.topic || 'Topic'}</p>
                  <p className="text-xs text-headers">
                    {block.subject ? `${block.subject} · ` : ''}
                    {block.scope ?? 'user'}
                    {block.askedCount ? ` · asked ${block.askedCount}×` : ''}
                  </p>
                  {block.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-paragraphs">
                      {block.description}
                    </p>
                  )}
                </div>
              ))}
              {group.items.length === 0 && (
                <p className="text-sm text-headers">Nothing here yet.</p>
              )}
              {group.items.length > 8 && (
                <p className="text-xs text-headers">+{group.items.length - 8} more</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a href="/api/account/memory/export" className="text-sm underline">
          Export memory
        </a>
        {confirming ? (
          <>
            <span className="text-xs text-headers">Delete every memory block?</span>
            <button
              onClick={() => void clear()}
              disabled={busy}
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
            className="text-sm text-headers underline hover:text-red-600"
          >
            Clear memory
          </button>
        )}
      </div>
    </section>
  );
}

export function Settings({
  user,
  profile,
  memory,
}: {
  user: SessionUser | null;
  profile: ProfileRow | null;
  memory: MemoryState;
}) {
  const signOut = useSignOut();

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-6 pt-16">
        <AuthCard />
      </div>
    );
  }

  const createdAt = profile?.createdAt ?? null;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-6">
      <h1 className="font-roca text-2xl text-foreground">Settings</h1>
      <p className="mt-1 text-sm text-headers">Your account and how Curio knows you.</p>

      <section className="mt-6 rounded-2xl border border-chat-panel-border bg-chat-panel p-5">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-headers">
          Account
        </h2>
        <Field label="Name" value={profile?.name ?? user.name} />
        <Field label="Email" value={user.email} />
        <Field
          label="Member since"
          value={createdAt ? new Date(createdAt).toLocaleDateString() : null}
        />
        <Field label="Country" value={profile?.country} />
        <Field label="About you" value={profile?.userDescription} />
      </section>

      <MemoryPanel initial={memory} />

      <section className="mt-4 rounded-2xl border border-chat-panel-border bg-chat-panel p-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-headers">
          Session
        </h2>
        <p className="text-sm text-headers">
          Signing out clears the session cookie; the documents and chats stay.
        </p>
        <button
          onClick={() =>
            signOut.mutate(undefined, { onSuccess: () => window.location.assign('/') })
          }
          disabled={signOut.isPending}
          className="mt-3 rounded-xl border border-chat-panel-border px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {signOut.isPending ? 'Signing out…' : 'Sign out'}
        </button>
        {signOut.error && (
          <p className="mt-2 text-sm text-red-600">{(signOut.error as Error).message}</p>
        )}
      </section>

      <AccountDangerZone email={user.email} />
    </div>
  );
}
