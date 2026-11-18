import { useState } from 'react';

import { useSignIn, useSignUp } from '../api';

/**
 * Sign-in + sign-up in one card; the API owns the session cookie.
 *
 * The migration notice is deliberate: Cognito password hashes cannot be verified
 * by the new auth stack, so nobody who predates the move has a usable password.
 * They get a reset link instead, and the copy says why rather than pretending the
 * password was wrong.
 */
export function AuthCard() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const signIn = useSignIn();
  const signUp = useSignUp();
  const error = signIn.error ?? signUp.error;
  const failed = Boolean(signIn.error);

  return (
    <div className="mx-auto mt-24 w-full max-w-md rounded-2xl border border-chat-panel-border bg-chat-panel p-6 shadow-sm">
      <h1 className="font-roca text-2xl text-foreground">Curio</h1>
      <p className="mt-1 text-sm text-muted-foreground">Sign in to continue learning.</p>

      <div className="mt-6 space-y-3">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
          autoComplete="email"
          className="w-full rounded-xl border border-chat-panel-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-curio-green/20"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          type="password"
          autoComplete="current-password"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && email && password) signIn.mutate({ email, password });
          }}
          className="w-full rounded-xl border border-chat-panel-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-curio-green/20"
        />
      </div>

      {error && (
        <div className="mt-3 rounded-xl border border-black/10 bg-white p-3 text-sm">
          <p className="text-red-600">Wrong email or password.</p>
          <p className="mt-1 text-xs text-headers">
            <strong>Moved from the old Curio?</strong> Your password could not be carried over
            — we never had access to it. Set a new one and everything else (documents, chats,
            cards) is already here.
          </p>
          <a href="/forgot" className="mt-2 inline-block text-xs font-medium underline">
            Set a new password
          </a>
        </div>
      )}

      <button
        onClick={() => signIn.mutate({ email, password })}
        disabled={signIn.isPending || !email || !password}
        className="mt-4 w-full rounded-xl bg-curio-green px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {signIn.isPending ? 'Signing in…' : 'Sign in'}
      </button>

      <div className="mt-4 flex items-center justify-between text-xs">
        <a href="/forgot" className="underline">
          Forgot password?
        </a>
        <span className="text-headers">
          {failed ? 'First time since the move? Use this.' : ''}
        </span>
      </div>

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
            disabled={signUp.isPending || !email || !password}
            className="w-full rounded-xl border border-chat-panel-border px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {signUp.isPending ? 'Creating…' : 'Sign up'}
          </button>
        </div>
      </details>
    </div>
  );
}
