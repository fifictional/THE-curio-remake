import { useState } from 'react';

/**
 * Export + delete, shared by /settings and /profile: both are places a user
 * looks for "my data". The delete button stays disabled until the email matches.
 */
export function AccountDangerZone({ email }: { email?: string | null }) {
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <section className="mt-4 rounded-2xl border border-chat-panel-border bg-chat-panel p-5">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-headers">
        Your data
      </h2>
      <p className="text-sm text-headers">
        Export is a JSON file with your spaces, documents, chats, messages, flashcards and
        quizzes.
      </p>
      <a
        href="/account/export"
        className="mt-3 inline-block rounded-xl border border-chat-panel-border px-4 py-2 text-sm font-medium"
      >
        Download my data
      </a>

      <div className="mt-6 border-t border-black/5 pt-4">
        <h3 className="text-sm font-semibold text-foreground">Delete this account</h3>
        <p className="mt-1 text-sm text-headers">
          Permanent. Your documents, chats, files and search vectors are removed immediately.
          Type <span className="font-mono text-foreground">{email}</span> to confirm.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="your email"
            className="w-64 rounded-xl border border-chat-panel-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-curio-green/20"
          />
          <button
            disabled={busy || confirm.trim().toLowerCase() !== (email ?? '').toLowerCase()}
            onClick={async () => {
              setBusy(true);
              setError(null);
              const res = await fetch('/account', {
                method: 'DELETE',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ confirmEmail: confirm }),
              });
              if (res.ok) {
                window.location.assign('/');
                return;
              }
              const body = (await res.json().catch(() => ({}))) as { error?: string };
              setError(body.error ?? `HTTP ${res.status}`);
              setBusy(false);
            }}
            className="rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-40"
          >
            {busy ? 'Deleting…' : 'Delete account'}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </section>
  );
}

