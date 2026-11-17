/**
 * Chat client.
 *
 * TanStack Query for server state; plain fetch for transport. Cookies are sent
 * same-origin through the Vite proxy, so Better Auth sessions just work.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Message, SessionUser } from './types';

export type { Message };

export interface Me {
  authenticated: boolean;
  user?: SessionUser;
}

/** Seeded by `npm run db:seed`. */
export const DEFAULT_CHAT = '44444444-4444-4444-8444-444444444444';

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = (await res.json().catch(() => ({}))) as T;
  if (!res.ok) {
    const message = (body as { error?: string }).error ?? `HTTP ${res.status}`;
    throw new Error(message);
  }
  return body;
}

/**
 * `initial` comes from the SSR loader: it makes the first paint correct without
 * a round trip, and `initialDataUpdatedAt` stops an immediate client refetch.
 */
export function useMe(initial?: SessionUser | null) {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await fetch('/me');
      if (res.status === 401) return { authenticated: false } as Me;
      return (await res.json()) as Me;
    },
    initialData:
      initial === undefined
        ? undefined
        : ({ authenticated: !!initial, user: initial ?? undefined } as Me),
    initialDataUpdatedAt: initial === undefined ? undefined : Date.now(),
    staleTime: 30_000,
  });
}

export function useSignIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (creds: { email: string; password: string }) =>
      json('/api/auth/sign-in/email', {
        method: 'POST',
        body: JSON.stringify(creds),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
}

export function useSignUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (creds: { email: string; password: string; name: string }) =>
      json('/api/auth/sign-up/email', {
        method: 'POST',
        body: JSON.stringify(creds),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => json('/api/auth/sign-out', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
}

export function useMessages(chatUuid: string | null, initial?: Message[]) {
  return useQuery({
    queryKey: ['messages', chatUuid],
    queryFn: () =>
      json<{ messages: Message[] }>(`/messages?chat=${encodeURIComponent(chatUuid!)}`),
    select: (d) => d.messages,
    enabled: !!chatUuid,
    initialData: initial === undefined ? undefined : { messages: initial },
    initialDataUpdatedAt: initial === undefined ? undefined : Date.now(),
    staleTime: 5_000,
  });
}

export function useAiChat(chatUuid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: string) =>
      json<{ messages: Message[]; mock: boolean }>('/aiChat', {
        method: 'POST',
        body: JSON.stringify({ chatUuid, message }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages', chatUuid] }),
  });
}

export function useRagSearch(chatUuid: string) {
  return useMutation({
    mutationFn: (q: string) =>
      json<{ hits: Array<{ messageUuid: string; score: number; text: string; role: string }> }>(
        `/rag/search?q=${encodeURIComponent(q)}&chat=${encodeURIComponent(chatUuid)}`,
      ),
  });
}
