import { Link } from '@tanstack/react-router';
import { useState } from 'react';


const card = 'mx-auto mt-16 w-full max-w-md rounded-2xl border border-chat-panel-border bg-chat-panel p-6';
const input = 'w-full rounded-xl border border-chat-panel-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-curio-green/20';
const button = 'w-full rounded-xl bg-curio-green px-4 py-2 text-sm font-medium text-white disabled:opacity-50';

async function post(path: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
  return res.ok ? { ok: true } : { ok: false, error: json.message ?? json.error ?? `HTTP ${res.status}` };
}

/** Request a reset link. The link itself is written to `.local/reset-links.log`. */
export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="mx-auto w-full max-w-md px-6 pt-16">
      <div className={card}>
        <h1 className="font-roca text-xl text-foreground">Reset your password</h1>
        <p className="mt-1 text-sm text-headers">
          We will send a link to that address if an account exists.
        </p>
        <p className="mt-2 rounded-xl border border-black/10 bg-white p-3 text-xs text-headers">
          <strong>Why this exists:</strong> passwords from the old Curio were stored by a
          different identity provider and cannot be verified here. Setting a new one takes a
          minute and keeps everything you had — documents, chats, flashcards, quizzes.
        </p>

        {sent ? (
          <div className="mt-4 space-y-2 text-sm text-headers">
            <p>Check your email for the reset link.</p>
            <p className="text-xs">
              Running locally? The link is in <code>.local/reset-links.log</code> (and stdout).
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={input}
            />
            <button
              disabled={busy || !email.includes('@')}
              className={button}
              onClick={async () => {
                setBusy(true);
                setError(null);
                const res = await post('/api/auth/request-password-reset', {
                  email: email.trim().toLowerCase(),
                  redirectTo: '/reset',
                });
                setBusy(false);
                if (res.ok) setSent(true);
                else setError(res.error ?? 'Could not send the link');
              }}
            >
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}

        <Link to="/" search={{ chat: undefined }} className="mt-4 inline-block text-sm underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}

/** Set a new password from the token in the link. */
export function ResetPassword({ token }: { token: string | null }) {
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="mx-auto w-full max-w-md px-6 pt-16">
      <div className={card}>
        <h1 className="font-roca text-xl text-foreground">Choose a new password</h1>

        {!token && (
          <p className="mt-2 text-sm text-red-600">
            This link is missing its token. Request a new one from the sign-in page.
          </p>
        )}

        {done ? (
          <div className="mt-4 space-y-2 text-sm text-headers">
            <p>Password updated.</p>
            <Link to="/" search={{ chat: undefined }} className="inline-block underline">
              Sign in with the new password
            </Link>
          </div>
        ) : (
          token && (
            <div className="mt-4 space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="new password (8+ characters)"
                className={input}
              />
              <button
                disabled={busy || password.length < 8}
                className={button}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  const res = await post('/api/auth/reset-password', { newPassword: password, token });
                  setBusy(false);
                  if (res.ok) setDone(true);
                  else setError(res.error ?? 'Could not reset the password');
                }}
              >
                {busy ? 'Saving…' : 'Set new password'}
              </button>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )
        )}
      </div>
    </div>
  );
}
