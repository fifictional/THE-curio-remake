/**
 * Server functions for the first paint.
 *
 * They run on the server (and over RPC when the client navigates), so the
 * session cookie never has to exist in the browser bundle for SSR to work.
 */

import { createServerFn } from '@tanstack/react-start';

import type {
  Chat,
  DocumentRow,
  DocumentSummaryRow,
  Message,
  ProfileRow,
  SessionUser,
  SpaceRow,
} from '../types';
import { apiFetch } from './fetch.server';

export interface ChatPageData {
  user: SessionUser | null;
  chatUuid: string | null;
  messages: Message[];
}

export const loadChatPage = createServerFn({ method: 'GET' })
  .validator((data: { chatUuid?: string }) => data)
  .handler(async ({ data }): Promise<ChatPageData> => {
    const session = await apiFetch<{ user: SessionUser }>('/me');
    if (!session?.user) return { user: null, chatUuid: null, messages: [] };

    const chats = await apiFetch<{ data: Chat[] }>('/db', {
      method: 'POST',
      body: JSON.stringify({ model: 'Chat', method: 'list', options: { limit: 20 } }),
    });

    // A deep link wins; otherwise the most recent conversation.
    const chatUuid = data.chatUuid ?? chats?.data?.[0]?.chatUuid ?? null;
    const messages = chatUuid
      ? ((await apiFetch<{ messages: Message[] }>(
          `/messages?chat=${encodeURIComponent(chatUuid)}`,
        ))?.messages ?? [])
      : [];

    return { user: session.user, chatUuid, messages };
  },
);

export interface SpacePageData {
  user: SessionUser | null;
  space: SpaceRow | null;
  chats: Chat[];
  documents: DocumentRow[];
}

export const loadSpace = createServerFn({ method: 'GET' })
  .validator((data: { spaceId: string }) => data)
  .handler(async ({ data }): Promise<SpacePageData> => {
    const session = await apiFetch<{ user: SessionUser }>('/me');
    if (!session?.user) return { user: null, space: null, chats: [], documents: [] };

    const space = await apiFetch<{ data: SpaceRow | null }>('/db', {
      method: 'POST',
      body: JSON.stringify({
        model: 'Space',
        method: 'get',
        args: { spaceUuid: data.spaceId },
      }),
    });

    if (!space?.data) return { user: session.user, space: null, chats: [], documents: [] };

    const [chats, documents] = await Promise.all([
      apiFetch<{ data: Chat[] }>('/db', {
        method: 'POST',
        body: JSON.stringify({
          model: 'Chat',
          method: 'listChatBySpaceUuidAndCreatedAt',
          args: { spaceUuid: data.spaceId },
          options: { limit: 100 },
        }),
      }),
      apiFetch<{ data: DocumentRow[] }>('/db', {
        method: 'POST',
        body: JSON.stringify({
          model: 'Document',
          method: 'listDocumentBySpaceUuidAndCreatedAt',
          args: { spaceUuid: data.spaceId },
          options: { limit: 100 },
        }),
      }),
    ]);

    return {
      user: session.user,
      space: space.data,
      chats: chats?.data ?? [],
      documents: documents?.data ?? [],
    };
  });

export interface LibraryData {
  user: SessionUser | null;
  documents: DocumentRow[];
  spaces: SpaceRow[];
}

export const loadLibrary = createServerFn({ method: 'GET' }).handler(
  async (): Promise<LibraryData> => {
    const session = await apiFetch<{ user: SessionUser }>('/me');
    if (!session?.user) return { user: null, documents: [], spaces: [] };

    const [documents, spaces] = await Promise.all([
      apiFetch<{ data: DocumentRow[] }>('/db', {
        method: 'POST',
        body: JSON.stringify({
          model: 'Document',
          method: 'list',
          args: {},
          options: { limit: 200 },
        }),
      }),
      apiFetch<{ data: SpaceRow[] }>('/db', {
        method: 'POST',
        body: JSON.stringify({ model: 'Space', method: 'list', options: { limit: 100 } }),
      }),
    ]);

    return {
      user: session.user,
      documents: documents?.data ?? [],
      spaces: spaces?.data ?? [],
    };
  },
);

export interface DocumentPageData {
  user: SessionUser | null;
  document: DocumentRow | null;
  summary: DocumentSummaryRow | null;
}

export const loadDocument = createServerFn({ method: 'GET' })
  .validator((data: { documentUuid: string }) => data)
  .handler(async ({ data }): Promise<DocumentPageData> => {
    const session = await apiFetch<{ user: SessionUser }>('/me');
    if (!session?.user) return { user: null, document: null, summary: null };

    const document = await apiFetch<{ data: DocumentRow | null }>('/db', {
      method: 'POST',
      body: JSON.stringify({
        model: 'Document',
        method: 'get',
        args: { documentUuid: data.documentUuid },
      }),
    });

    if (!document?.data) return { user: session.user, document: null, summary: null };

    // RLS scopes this to the caller's documents; the bridge sorts newest first.
    const summaries = await apiFetch<{ data: DocumentSummaryRow[] }>('/db', {
      method: 'POST',
      body: JSON.stringify({
        model: 'DocumentSummary',
        method: 'listDocumentSummaryByDocumentUuidAndCreatedAt',
        args: { documentUuid: data.documentUuid },
        options: { limit: 1 },
      }),
    });

    return {
      user: session.user,
      document: document.data,
      summary: summaries?.data?.[0] ?? null,
    };
  });

export interface SettingsData {
  user: SessionUser | null;
  profile: ProfileRow | null;
}

export const loadSettings = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SettingsData> => {
    const session = await apiFetch<{ user: SessionUser }>('/me');
    if (!session?.user) return { user: null, profile: null };

    const profile = await apiFetch<{ data: ProfileRow | null }>('/db', {
      method: 'POST',
      body: JSON.stringify({
        model: 'UserProfile',
        method: 'get',
        args: { id: session.user.sub },
      }),
    });

    return { user: session.user, profile: profile?.data ?? null };
  },
);
