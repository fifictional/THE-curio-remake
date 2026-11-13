'use client';

/**
 * `useAuthenticator()` replacement.
 *
 * The original components read `const { user } = useAuthenticator()` and, in the
 * SAT-mini screens, `{ route, user }`. This returns the same fields from the
 * Better Auth session so those files stay untouched.
 */

import { useEffect, useState } from 'react';

import { getMe, type LocalUser } from './local-auth';

type AuthRoute = 'authenticated' | 'signIn' | 'idle';

interface AuthenticatorContext {
  user: { userId: string; username: string; signInDetails: { loginId?: string | null } } | null;
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
  const [user, setUser] = useState<LocalUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    getMe().then((me) => {
      if (!alive) return;
      setUser(me);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const context: AuthenticatorContext = {
    user: user
      ? { userId: user.sub, username: user.email ?? user.sub, signInDetails: { loginId: user.email } }
      : null,
    route: user ? 'authenticated' : ready ? 'signIn' : 'idle',
    authStatus: user ? 'authenticated' : ready ? 'unauthenticated' : 'configuring',
    signOut: async () => {
      const { signOut } = await import('./local-auth');
      await signOut();
      setUser(null);
    },
  };

  return context;
}
