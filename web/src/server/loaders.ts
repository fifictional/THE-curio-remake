/**
 * Data loaders for the first paint.
 *
 * Plain async functions on purpose: the `createServerFn` wrappers in `api.ts`
 * need a request context, which makes them impossible to unit test. All the
 * logic — session check, uuid guards, which chat to open, creating the first
 * conversation — lives here, provable with a mocked fetch.
 */

import type {
  Chat,
  CitationRow,
  DocumentRow,
  DocumentSummaryRow,
  FlashcardRow,
  Message,
  ProfileRow,
  QuizRow,
  SessionUser,
  SpaceRow,
} from '../types';
import { isUuid } from '../lib/uuid';
import { apiFetch } from './fetch.server';

export interface ChatPageData {
  user: SessionUser | null;
  chatUuid: string | null;
  messages: Message[];
  citations: CitationRow[];
}

export async function loadChatPageData(
  data: { chatUuid?: string },
): Promise<ChatPageData> {
  const session = await apiFetch<{ user: SessionUser }>('/me');
  if (!session?.user) return { user: null, chatUuid: null, messages: [], citations: [] };

  const chats = await apiFetch<{ data: Chat[] }>('/db', {
    method: 'POST',
    body: JSON.stringify({ model: 'Chat', method: 'list', options: { limit: 20 } }),
  });

  // A deep link wins; otherwise the most recent conversation.
  let chatUuid: string | null = isUuid(data.chatUuid)
    ? data.chatUuid
    : (chats?.data?.[0]?.chatUuid ?? null);

  /*
   * A brand-new account has no conversation, and the chat screen is where they
   * land. Create the first one here rather than bouncing them to an empty
   * screen: the bridge defaults ownership to the caller, so this is one call.
   */
  if (!chatUuid) {
    const created = await apiFetch<{ data: { chatUuid?: string } | null }>('/db', {
      method: 'POST',
      body: JSON.stringify({ model: 'Chat', method: 'create', args: { name: 'New chat' } }),
    });
    chatUuid = created?.data?.chatUuid ?? null;
  }

  const messages = chatUuid
    ? ((await apiFetch<{ messages: Message[] }>(
        `/messages?chat=${encodeURIComponent(chatUuid)}`,
      ))?.messages ?? [])
    : [];

  // Sources written by /aiChat, scoped to the chat by RLS.
  const citations = chatUuid
    ? ((
        await apiFetch<{ data: CitationRow[] }>('/db', {
          method: 'POST',
          body: JSON.stringify({
            model: 'ChatCitation',
            method: 'listChatCitationByChatUuidAndCreatedAt',
            args: { chatUuid },
            options: { limit: 100 },
          }),
        })
      )?.data ?? [])
    : [];

  return { user: session.user, chatUuid, messages, citations };
}

export interface SpacePageData {
  user: SessionUser | null;
  space: SpaceRow | null;
  chats: Chat[];
  documents: DocumentRow[];
}

export async function loadSpaceData(data: { spaceId: string }): Promise<SpacePageData> {
  const session = await apiFetch<{ user: SessionUser }>('/me');
  if (!session?.user) return { user: null, space: null, chats: [], documents: [] };
  if (!isUuid(data.spaceId)) {
    return { user: session.user, space: null, chats: [], documents: [] };
  }

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
}

export interface LibraryData {
  user: SessionUser | null;
  documents: DocumentRow[];
  spaces: SpaceRow[];
}

export async function loadLibraryData(): Promise<LibraryData> {
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
}

export interface DocumentPageData {
  user: SessionUser | null;
  document: DocumentRow | null;
  summary: DocumentSummaryRow | null;
  flashcards: FlashcardRow[];
  quizzes: QuizRow[];
}

export async function loadDocumentData(data: {
  documentUuid: string;
}): Promise<DocumentPageData> {
  const session = await apiFetch<{ user: SessionUser }>('/me');
  if (!session?.user) {
    return { user: null, document: null, summary: null, flashcards: [], quizzes: [] };
  }
  if (!isUuid(data.documentUuid)) {
    return { user: session.user, document: null, summary: null, flashcards: [], quizzes: [] };
  }

  const document = await apiFetch<{ data: DocumentRow | null }>('/db', {
    method: 'POST',
    body: JSON.stringify({
      model: 'Document',
      method: 'get',
      args: { documentUuid: data.documentUuid },
    }),
  });

  if (!document?.data) {
    return { user: session.user, document: null, summary: null, flashcards: [], quizzes: [] };
  }

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

  // Read-only study material that already exists for this document. Generation
  // is not part of this build (the chat tools that produced it are not ported).
  const [flashcards, quizzes] = await Promise.all([
    apiFetch<{ data: FlashcardRow[] }>('/db', {
      method: 'POST',
      body: JSON.stringify({
        model: 'Flashcard',
        method: 'listFlashcardByDocumentUuidAndCreatedAt',
        args: { documentUuid: data.documentUuid },
        options: { limit: 200 },
      }),
    }),
    apiFetch<{ data: QuizRow[] }>('/db', {
      method: 'POST',
      body: JSON.stringify({
        model: 'Quiz',
        method: 'listQuizBySourceUuidAndCreatedAt',
        args: { sourceUuid: data.documentUuid },
        options: { limit: 50 },
      }),
    }),
  ]);

  return {
    user: session.user,
    document: document.data,
    summary: summaries?.data?.[0] ?? null,
    flashcards: flashcards?.data ?? [],
    quizzes: quizzes?.data ?? [],
  };
}

export interface SettingsData {
  user: SessionUser | null;
  profile: ProfileRow | null;
}

export async function loadSettingsData(): Promise<SettingsData> {
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
}
