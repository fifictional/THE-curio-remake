'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionContext } from '@/providers/session-provider';
import { getMe, signIn, signUp } from '@/lib/local-auth';

/**
 * Patched login page.
 *
 * The original renders Amplify's <Authenticator> (Cognito). Locally there is no
 * Cognito, so this posts to Better Auth on the new API instead. Everything
 * downstream (session provider, redirects, onboarding) is unchanged.
 */
export default function LoginPage() {
  const router = useRouter();
  const { userProfile } = useSessionContext();
  const [email, setEmail] = useState('local@curio.test');
  const [password, setPassword] = useState('localpassword123');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userProfile) return;
    if (!userProfile.onboardingCompleted && !userProfile.onboardingSkipped) {
      router.replace('/onboarding');
      return;
    }
    const redirectUrl = localStorage.getItem('post_auth_redirect');
    if (redirectUrl) {
      localStorage.removeItem('post_auth_redirect');
      router.replace(redirectUrl);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    router.replace(params.get('redirect') ?? '/');
  }, [userProfile, router]);

  const submit = async (mode: 'in' | 'up') => {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'in') await signIn({ email, password });
      else await signUp({ email, password });
      const me = await getMe();
      if (!me) throw new Error('Sign in failed');
      const target = new URLSearchParams(window.location.search).get('redirect');
      window.location.assign(target || '/chats/44444444-4444-4444-8444-444444444444');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-focus px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 shadow-sm">
        <h1 className="font-[family-name:var(--font-plus-jakarta-sans)] text-2xl font-semibold text-foreground">
          Curio
        </h1>
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
