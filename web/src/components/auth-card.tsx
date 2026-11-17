import { useState } from 'react';

import { useSignIn, useSignUp } from '../api';

/** Sign-in + sign-up in one card; the API owns the session cookie. */
export function AuthCard() {
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

