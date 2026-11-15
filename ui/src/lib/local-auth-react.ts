'use client';

/**
 * `useAuthenticator()` replacement.
 *
 * The original components read `const { user } = useAuthenticator()` and, in the
 * SAT-mini screens, `{ route, user }`. This returns the same fields from the
 * Better Auth session.
 *
 * IMPORTANT: the returned object must be referentially stable. Several effects
 * in the app (e.g. session-provider emitting `session:init`) depend on `user`
 * in their dependency arrays; a fresh object each render made those effects fire
 * on every render, which looped (analytics identify -> render -> effect ...) and
 * froze the UI as soon as anything was clicked.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { getMe, signOut as doSignOut, type LocalUser } from './local-auth';

type AuthRoute = 'authenticated' | 'signIn' | 'idle';

interface AuthUser {
  userId: string;
  username: string;
  signInDetails: { loginId?: string | null };
}

interface AuthenticatorContext {
  user: AuthUser | null;
  route: AuthRoute;
  authStatus: 'authenticated' | 'unauthenticated' | 'configuring';
  signOut: () => Promise<void>;
}

/**
 * Tolerates Amplify's selector form. The original SAT-mini screens call
 * `useAuthenticator((ctx) => [ctx.route, ctx.user])` but destructure an OBJECT
 * from it (`{ route, user }`), so the selector is ignored and the context object
 * is always returned — which is what those screens actually need at runtime.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useAuthenticator(_selector?: (context: AuthenticatorContext) => unknown): any {
  const [me, setMe] = useState<LocalUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    getMe().then((found) => {
      if (!alive) return;
      setMe(found);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const user = useMemo<AuthUser | null>(
    () =>
      me
        ? {
            userId: me.sub,
            username: me.email ?? me.sub,
            signInDetails: { loginId: me.email },
          }
        : null,
    [me?.sub, me?.email],
  );

  const signOut = useCallback(async () => {
    await doSignOut();
    setMe(null);
  }, []);

  const route: AuthRoute = user ? 'authenticated' : ready ? 'signIn' : 'idle';
  const authStatus: AuthenticatorContext['authStatus'] = user
    ? 'authenticated'
    : ready
      ? 'unauthenticated'
      : 'configuring';

  const context = useMemo<AuthenticatorContext>(
    () => ({ user, route, authStatus, signOut }),
    [user, route, authStatus, signOut],
  );

  return context;
}
