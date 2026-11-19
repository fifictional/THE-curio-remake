/**
 * Chat client.
 *
 * TanStack Query for server state; plain fetch for transport. Cookies are sent
 * same-origin through the Vite proxy, so Better Auth sessions just work.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CitationRow, Message, SessionUser } from './types';

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
    headers: { 'content-type': 'application/json', ...init?.headers },
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
    initialDataUpdatedAt: initial === undefined ? undefined : () => Date.now(),
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
    initialDataUpdatedAt: initial === undefined ? undefined : () => Date.now(),
    // Same 4s cadence as the legacy app's polling stand-in for AppSync.
    refetchInterval: 4_000,
  });
}

export function useCitations(chatUuid: string | null, initial?: CitationRow[]) {
  return useQuery({
    queryKey: ['citations', chatUuid],
    queryFn: () =>
      json<{ data: CitationRow[] }>('/db', {
        method: 'POST',
        body: JSON.stringify({
          model: 'ChatCitation',
          method: 'listChatCitationByChatUuidAndCreatedAt',
          args: { chatUuid },
          options: { limit: 100 },
        }),
      }).then((r) => r.data ?? []),
    enabled: !!chatUuid,
    initialData: initial,
    initialDataUpdatedAt: initial === undefined ? undefined : () => Date.now(),
    refetchInterval: 8_000,
  });
}

/** Creates the first conversation; the greeting sends through it. */
export function useCreateChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: { name?: string; documentUuid?: string } = {},
    ): Promise<string | null> => {
      const res = await json<{ data: { chatUuid?: string } | null }>('/db', {
        method: 'POST',
        body: JSON.stringify({
          model: 'Chat',
          method: 'create',
          args: { name: input.name ?? 'New chat', documentUuid: input.documentUuid },
        }),
      });
      const chatUuid = res.data?.chatUuid ?? null;
      if (chatUuid) qc.invalidateQueries({ queryKey: ['me'] });
      return chatUuid;
    },
  });
}

/**
 * Folders are `Space` rows. Creating one and filing a document are the two
 * mutations the library needs; both go through the bridge, which defaults
 * ownership to the caller and enforces it with RLS.
 */
export function useCreateSpace() {
  return useMutation({
    mutationFn: (name: string) =>
      json<{ data: { spaceUuid?: string } | null }>('/db', {
        method: 'POST',
        body: JSON.stringify({ model: 'Space', method: 'create', args: { name } }),
      }),
  });
}

export function useRenameSpace() {
  return useMutation({
    mutationFn: ({ spaceUuid, name }: { spaceUuid: string; name: string }) =>
      json('/db', {
        method: 'POST',
        body: JSON.stringify({ model: 'Space', method: 'update', args: { spaceUuid, name } }),
      }),
  });
}

export function useDeleteSpace() {
  return useMutation({
    mutationFn: (spaceUuid: string) =>
      json('/db', {
        method: 'POST',
        body: JSON.stringify({ model: 'Space', method: 'delete', args: { spaceUuid } }),
      }),
  });
}

export function useMoveChat() {
  return useMutation({
    mutationFn: ({ chatUuid, spaceUuid }: { chatUuid: string; spaceUuid: string | null }) =>
      json('/db', {
        method: 'POST',
        body: JSON.stringify({ model: 'Chat', method: 'update', args: { chatUuid, spaceUuid } }),
      }),
  });
}

export function useRenameChat() {
  return useMutation({
    mutationFn: ({ chatUuid, name }: { chatUuid: string; name: string }) =>
      json('/db', {
        method: 'POST',
        body: JSON.stringify({ model: 'Chat', method: 'update', args: { chatUuid, name } }),
      }),
  });
}

export function useDeleteChat() {
  return useMutation({
    mutationFn: (chatUuid: string) =>
      json('/db', {
        method: 'POST',
        body: JSON.stringify({ model: 'Chat', method: 'delete', args: { chatUuid } }),
      }),
  });
}

export function useDeleteDocument() {
  return useMutation({
    mutationFn: (documentUuid: string) =>
      json('/db', {
        method: 'POST',
        body: JSON.stringify({ model: 'Document', method: 'delete', args: { documentUuid } }),
      }),
  });
}

export function useMoveDocument() {
  return useMutation({
    mutationFn: ({ documentUuid, spaceUuid }: { documentUuid: string; spaceUuid: string | null }) =>
      json<{ data: unknown }>('/db', {
        method: 'POST',
        body: JSON.stringify({
          model: 'Document',
          method: 'update',
          args: { documentUuid, spaceUuid },
        }),
      }),
  });
}

export function useAiChat(chatUuid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ message, chatUuid: explicit }: { message: string; chatUuid?: string }) =>
      json<{ messages: Message[]; mock: boolean }>('/aiChat', {
        method: 'POST',
        body: JSON.stringify({ chatUuid: explicit ?? chatUuid, message }),
      }),
    onSuccess: (_data, variables) => {
      const target = variables.chatUuid ?? chatUuid;
      qc.invalidateQueries({ queryKey: ['messages', target] });
      qc.invalidateQueries({ queryKey: ['citations', target] });
    },
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
