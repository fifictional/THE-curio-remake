'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMe, signIn, signUp } from '@/lib/local-auth';

/**
 * Patched sign-in page.
 *
 * The original rendered <GuestLayout /> which wraps Amplify's <Authenticator>
 * (Cognito) — that is the "Auth UserPool not configured" screen locally. This
 * posts to Better Auth on the new API instead and then follows `?redirect=`.
 */
export default function SignInPage() {
  const router = useRouter();
  const [redirect, setRedirect] = useState('/');
  const [email, setEmail] = useState('local@curio.test');
  const [password, setPassword] = useState('localpassword123');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // `useSearchParams()` requires a Suspense boundary and was breaking hydration
  // (buttons rendered but did nothing). Read the query string client-side.
  useEffect(() => {
    const target = new URLSearchParams(window.location.search).get('redirect') ?? '/';
    setRedirect(target);
    getMe().then((me) => {
      if (me) router.replace(target);
    });
  }, [router]);

  const submit = async (mode: 'in' | 'up') => {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'in') await signIn({ email, password });
      else await signUp({ email, password });
      router.refresh();
      router.replace(redirect);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-focus px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">Curio</h1>
        <p className="mt-1 text-sm text-paragraphs">Sign in to continue.</p>

        <div className="mt-6 space-y-3">
          <input
            className="w-full rounded-xl border border-border px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
          />
          <input
            className="w-full rounded-xl border border-border px-3 py-2 text-sm"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
          />
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          disabled={busy}
          onClick={() => submit('in')}
          className="mt-5 w-full rounded-xl bg-curio-green px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <button
          disabled={busy}
          onClick={() => submit('up')}
          className="mt-2 w-full rounded-xl border border-border px-4 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          Create account
        </button>
      </div>
    </div>
  );
}
