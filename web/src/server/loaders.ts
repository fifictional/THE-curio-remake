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
  MetadataRow,
  SubscriptionRow,
  CitationRow,
  DocumentRow,
  DocumentSummaryRow,
  FlashcardRow,
  Message,
  ProfileRow,
  QuizRow,
  SpaceMember,
  SessionUser,
  SpaceRow,
} from '../types';
import { isUuid } from '../lib/uuid';
import { apiFetch } from './fetch.server';

export interface ChatPageData {
  user: (SessionUser & { onboardingCompleted?: boolean }) | null;
  onboardingCompleted: boolean;
  firstName: string | null;
  chatUuid: string | null;
  chatName: string | null;
  chatSpaceUuid: string | null;
  spaces: SpaceRow[];
  messages: Message[];
  citations: CitationRow[];
}

export async function loadChatPageData(
  data: { chatUuid?: string },
): Promise<ChatPageData> {
  const session = await apiFetch<{ user: SessionUser }>('/me');
  if (!session?.user) {
    return {
      user: null,
      onboardingCompleted: false,
      firstName: null,
      chatUuid: null,
      chatName: null,
      chatSpaceUuid: null,
      spaces: [],
      messages: [],
      citations: [],
    };
  }

  const name = session.user.name ?? '';
  const firstName = name.trim().split(' ')[0] || session.user.email?.split('@')[0] || null;

  /*
   * A deep link opens that conversation; otherwise the home screen is the
   * greeting, exactly like the product. No chat is created until the first
   * message — see `useStartChat` in the client.
   */
  const chatUuid: string | null = isUuid(data.chatUuid) ? data.chatUuid : null;

  const [chatRow, spaces] = await Promise.all([
    chatUuid
      ? apiFetch<{ data: { name?: string | null; spaceUuid?: string | null } | null }>('/db', {
          method: 'POST',
          body: JSON.stringify({ model: 'Chat', method: 'get', args: { chatUuid } }),
        })
      : Promise.resolve(null),
    apiFetch<{ data: SpaceRow[] }>('/db', {
      method: 'POST',
      body: JSON.stringify({ model: 'Space', method: 'list', options: { limit: 100 } }),
    }),
  ]);

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

  return {
    user: session.user,
    onboardingCompleted: Boolean(
      (session.user as { onboardingCompleted?: boolean }).onboardingCompleted,
    ),
    firstName,
    chatUuid,
    chatName: chatRow?.data?.name ?? null,
    chatSpaceUuid: chatRow?.data?.spaceUuid ?? null,
    spaces: spaces?.data ?? [],
    messages,
    citations,
  };
}

export interface SpacePageData {
  user: SessionUser | null;
  space: SpaceRow | null;
  chats: Chat[];
  documents: DocumentRow[];
  members: SpaceMember[];
  myLevel: number | null;
}

export async function loadSpaceData(data: { spaceId: string }): Promise<SpacePageData> {
  const session = await apiFetch<{ user: SessionUser }>('/me');
  if (!session?.user) {
    return {
      user: null,
      space: null,
      chats: [],
      documents: [],
      members: [],
      myLevel: null,
    };
  }
  if (!isUuid(data.spaceId)) {
    return {
      user: session.user,
      space: null,
      chats: [],
      documents: [],
      members: [],
      myLevel: null,
    };
  }

  const space = await apiFetch<{ data: SpaceRow | null }>('/db', {
    method: 'POST',
    body: JSON.stringify({
      model: 'Space',
      method: 'get',
      args: { spaceUuid: data.spaceId },
    }),
  });

  if (!space?.data) {
    return {
      user: session.user,
      space: null,
      chats: [],
      documents: [],
      members: [],
      myLevel: null,
    };
  }

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

  // Membership is read through the API (it joins user emails; `space_users` is
  // self-only under RLS, which is what keeps the policy cycle-free).
  const membership = await apiFetch<{ members?: SpaceMember[] }>(
    `/api/spaces/${data.spaceId}/members`,
  );
  const members = membership?.members ?? [];
  const mine = members.find((member) => member.userUuid === session.user.sub);

  return {
    user: session.user,
    space: space.data,
    chats: chats?.data ?? [],
    documents: documents?.data ?? [],
    members,
    myLevel: mine?.level ?? null,
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
  /** The document's own conversation, if one exists. */
  chatUuid: string | null;
}

export async function loadDocumentData(data: {
  documentUuid: string;
}): Promise<DocumentPageData> {
  const session = await apiFetch<{ user: SessionUser }>('/me');
  if (!session?.user) {
    return {
      user: null,
      document: null,
      summary: null,
      flashcards: [],
      quizzes: [],
      chatUuid: null,
    };
  }
  if (!isUuid(data.documentUuid)) {
    return {
      user: session.user,
      document: null,
      summary: null,
      flashcards: [],
      quizzes: [],
      chatUuid: null,
    };
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
    return {
      user: session.user,
      document: null,
      summary: null,
      flashcards: [],
      quizzes: [],
      chatUuid: null,
    };
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
  const [flashcards, quizzes, chats] = await Promise.all([
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
    apiFetch<{ data: Chat[] }>('/db', {
      method: 'POST',
      body: JSON.stringify({
        model: 'Chat',
        method: 'listChatByDocumentUuidAndCreatedAt',
        args: { documentUuid: data.documentUuid },
        options: { limit: 1 },
      }),
    }),
  ]);

  return {
    user: session.user,
    document: document.data,
    summary: summaries?.data?.[0] ?? null,
    flashcards: flashcards?.data ?? [],
    quizzes: quizzes?.data ?? [],
    chatUuid: chats?.data?.[0]?.chatUuid ?? null,
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

export interface ProfilePageData {
  user: SessionUser | null;
  profile: ProfileRow | null;
  subscription: SubscriptionRow | null;
}

export async function loadProfileData(): Promise<ProfilePageData> {
  const session = await apiFetch<{ user: SessionUser }>('/me');
  if (!session?.user) return { user: null, profile: null, subscription: null };

  const [profile, subscriptions] = await Promise.all([
    apiFetch<{ data: ProfileRow | null }>('/db', {
      method: 'POST',
      body: JSON.stringify({ model: 'UserProfile', method: 'get', args: { id: session.user.sub } }),
    }),
    apiFetch<{ data: SubscriptionRow[] }>('/db', {
      method: 'POST',
      body: JSON.stringify({ model: 'CurioSubscription', method: 'list', options: { limit: 1 } }),
    }),
  ]);

  return {
    user: session.user,
    profile: profile?.data ?? null,
    subscription: subscriptions?.data?.[0] ?? null,
  };
}

export interface MetadataPageData {
  user: SessionUser | null;
  targetUuid: string;
  metadata: MetadataRow[];
}

export async function loadMetadataData(data: {
  targetUuid: string;
}): Promise<MetadataPageData> {
  const session = await apiFetch<{ user: SessionUser }>('/me');
  if (!session?.user) return { user: null, targetUuid: data.targetUuid, metadata: [] };
  if (!isUuid(data.targetUuid)) {
    return { user: session.user, targetUuid: data.targetUuid, metadata: [] };
  }

  // RLS scopes metadata by its target (a user's own flags, or a chat/document
  // they own), so this list is already limited to what the caller may see.
  const rows = await apiFetch<{ data: MetadataRow[] }>('/db', {
    method: 'POST',
    body: JSON.stringify({
      model: 'Metadata',
      method: 'listMetadataByTargetUuidAndCreatedAt',
      args: { targetUuid: data.targetUuid },
      options: { limit: 200 },
    }),
  });

  return { user: session.user, targetUuid: data.targetUuid, metadata: rows?.data ?? [] };
}

export interface ShellData {
  user: SessionUser | null;
  firstName: string | null;
  chats: Chat[];
  documents: DocumentRow[];
  spaces: SpaceRow[];
}

/** Sidebar contents, loaded once by the root route for every screen. */
export async function loadShellData(): Promise<ShellData> {
  const session = await apiFetch<{ user: SessionUser }>('/me');
  if (!session?.user) return { user: null, firstName: null, chats: [], documents: [], spaces: [] };

  const [chats, documents, spaces] = await Promise.all([
    apiFetch<{ data: Chat[] }>('/db', {
      method: 'POST',
      body: JSON.stringify({ model: 'Chat', method: 'list', options: { limit: 25 } }),
    }),
    apiFetch<{ data: DocumentRow[] }>('/db', {
      method: 'POST',
      body: JSON.stringify({ model: 'Document', method: 'list', options: { limit: 25 } }),
    }),
    apiFetch<{ data: SpaceRow[] }>('/db', {
      method: 'POST',
      body: JSON.stringify({ model: 'Space', method: 'list', options: { limit: 25 } }),
    }),
  ]);

  const name = session.user.name ?? '';
  const firstName = name.trim().split(' ')[0] || session.user.email?.split('@')[0] || null;

  return {
    user: session.user,
    firstName,
    chats: chats?.data ?? [],
    documents: documents?.data ?? [],
    spaces: spaces?.data ?? [],
  };
}

export interface WelcomeData {
  user: (SessionUser & { onboardingCompleted?: boolean }) | null;
  firstName: string | null;
}

export async function loadWelcomeData(): Promise<WelcomeData> {
  const session = await apiFetch<{ user: SessionUser }>('/me');
  if (!session?.user) return { user: null, firstName: null };

  const name = session.user.name ?? '';
  return {
    user: session.user,
    firstName: name.trim().split(' ')[0] || session.user.email?.split('@')[0] || null,
  };
}
