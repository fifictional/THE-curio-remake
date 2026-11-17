/**
 * Server functions for the first paint.
 *
 * They run on the server (and over RPC when the client navigates), so the
 * session cookie never has to exist in the browser bundle for SSR to work.
 */

import { createServerFn } from '@tanstack/react-start';

import type { Chat, Message, SessionUser } from '../types';
import { apiFetch } from './fetch.server';

export interface ChatPageData {
  user: SessionUser | null;
  chatUuid: string | null;
  messages: Message[];
}

export const loadChatPage = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ChatPageData> => {
    const session = await apiFetch<{ user: SessionUser }>('/me');
    if (!session?.user) return { user: null, chatUuid: null, messages: [] };

    const chats = await apiFetch<{ data: Chat[] }>('/db', {
      method: 'POST',
      body: JSON.stringify({ model: 'Chat', method: 'list', options: { limit: 20 } }),
    });

    const chatUuid = chats?.data?.[0]?.chatUuid ?? null;
    const messages = chatUuid
      ? ((await apiFetch<{ messages: Message[] }>(
          `/messages?chat=${encodeURIComponent(chatUuid)}`,
        ))?.messages ?? [])
      : [];

    return { user: session.user, chatUuid, messages };
  },
);
