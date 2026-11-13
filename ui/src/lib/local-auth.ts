/**
 * Auth shim — replaces Cognito for the strangler run.
 *
 * The original UI talks to Cognito via `aws-amplify/auth` and to the Amplify
 * UI `<Authenticator>`. Neither exists locally, so this module exposes the same
 * shapes backed by Better Auth on the new API (`/api/auth/*`, `GET /me`).
 *
 * Keep this file boring: it exists so the 1,000+ files of the original UI do
 * not need to change.
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3101';

export interface LocalUser {
  sub: string;
  email?: string | null;
  name?: string | null;
}

let cached: LocalUser | null | undefined;

export async function getMe(): Promise<LocalUser | null> {
  if (cached !== undefined) return cached;
  const res = await fetch(`${API}/me`, { credentials: 'include' });
  if (res.status === 401) {
    cached = null;
    return null;
  }
  const body = (await res.json()) as { user?: LocalUser };
  cached = body.user ?? null;
  return cached;
}

export function clearAuthCache() {
  cached = undefined;
}

/** Same shape Amplify returns for `fetchAuthSession()`. */
export async function fetchAuthSession() {
  const me = await getMe();
  if (!me) throw new Error('Not signed in');
  return {
    tokens: {
      idToken: {
        payload: {
          sub: me.sub,
          email: me.email,
          given_name: (me.name ?? '').split(' ')[0],
          family_name: (me.name ?? '').split(' ').slice(1).join(' '),
          'cognito:groups': [] as string[],
        },
        toString: () => 'local',
      },
      accessToken: {
        payload: { sub: me.sub, 'cognito:groups': [] as string[] },
        toString: () => 'local',
      },
    },
    userSub: me.sub,
    identityId: me.sub,
  };
}

/** Same shape Amplify returns for `fetchUserAttributes()`. */
export async function fetchUserAttributes() {
  const me = await getMe();
  if (!me) throw new Error('Not signed in');
  const [givenName = '', ...rest] = (me.name ?? '').split(' ');
  return {
    sub: me.sub,
    email: me.email ?? '',
    name: me.name ?? '',
    given_name: givenName,
    family_name: rest.join(' '),
  };
}

export async function getCurrentUser() {
  const me = await getMe();
  if (!me) throw new Error('Not signed in');
  return { userId: me.sub, username: me.email ?? me.sub, signInDetails: { loginId: me.email } };
}

export async function signOut() {
  clearAuthCache();
  await fetch(`${API}/api/auth/sign-out`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
}

export async function signIn(input: { email: string; password: string }) {
  const res = await fetch(`${API}/api/auth/sign-in/email`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error((await res.text()) || 'Sign in failed');
  clearAuthCache();
  return getMe();
}

export async function signUp(input: { email: string; password: string; name?: string }) {
  const res = await fetch(`${API}/api/auth/sign-up/email`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: input.name ?? input.email.split('@')[0], ...input }),
  });
  if (!res.ok) throw new Error((await res.text()) || 'Sign up failed');
  clearAuthCache();
  return getMe();
}
