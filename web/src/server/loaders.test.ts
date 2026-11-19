/**
 * The server functions are where the auth and identifier edge cases live, and
 * they had no tests. `apiFetch` is mocked; everything above it is real.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.fn();

vi.mock('./fetch.server', () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));

const {
  loadChatPageData: loadChatPage,
  loadDocumentData: loadDocument,
  loadLibraryData: loadLibrary,
  loadMetadataData: loadMetadata,
  loadProfileData: loadProfile,
  loadSettingsData: loadSettings,
  loadSpaceData: loadSpace,
} = await import('./loaders');

const USER = { sub: '11111111-1111-4111-8111-111111111111', email: 'a@curio.test' };
const CHAT_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CHAT_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const DOC = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

/** Answer each `/db` call by model, the way the bridge does. */
function mockBridge(byModel: Record<string, unknown>) {
  apiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    if (path === '/me') return { user: USER };
    if (path.startsWith('/messages')) return { messages: [{ messageUuid: 'm1', content: 'hi' }] };
    if (path === '/db') {
      const body = JSON.parse(String(init?.body)) as { model: string };
      return byModel[body.model] ?? { data: [] };
    }
    throw new Error(`unexpected fetch ${path}`);
  });
}

beforeEach(() => {
  apiFetch.mockReset();
});

describe('loadChatPage', () => {
  it('returns an empty page when signed out, without touching the bridge', async () => {
    apiFetch.mockResolvedValueOnce(null); // /me → 401

    const data = await loadChatPage({});

    expect(data).toEqual({
      user: null,
      onboardingCompleted: false,
      firstName: null,
      chatUuid: null,
      chatName: null,
      chatSpaceUuid: null,
      spaces: [],
      messages: [],
      citations: [],
    });
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith('/me');
  });

  it('opens the conversation named in a valid deep link', async () => {
    mockBridge({ Chat: { data: [{ chatUuid: CHAT_A }] }, ChatCitation: { data: [] } });

    const data = await loadChatPage({ chatUuid: CHAT_B });

    expect(data.chatUuid).toBe(CHAT_B);
    const paths = apiFetch.mock.calls.map((c) => String(c[0]));
    expect(paths.some((p) => p.startsWith(`/messages?chat=${CHAT_B}`))).toBe(true);
  });

  it('shows the greeting for a malformed deep link instead of asking the API', async () => {
    mockBridge({ Chat: { data: [{ chatUuid: CHAT_A }] }, ChatCitation: { data: [] } });

    const data = await loadChatPage({ chatUuid: 'not-a-uuid' });

    expect(data.chatUuid).toBeNull();
    const paths = apiFetch.mock.calls.map((c) => String(c[0]));
    expect(paths.some((p) => p.includes('not-a-uuid'))).toBe(false);
  });

  it('never creates a conversation as a side effect of loading', async () => {
    // Creation belongs to the first message (`useCreateChat`), so the home screen
    // is the greeting rather than an empty chat that already exists.
    mockBridge({ Chat: { data: [] }, ChatCitation: { data: [] } });

    const data = await loadChatPage({});

    expect(data.chatUuid).toBeNull();
    const created = apiFetch.mock.calls.find(
      (c) => String(c[0]) === '/db' && String(c[1]?.body).includes('"create"'),
    );
    expect(created, 'loading a page must not write').toBeUndefined();
  });
});

describe('loadDocument', () => {
  it('treats a malformed id as not found without querying', async () => {
    mockBridge({});

    const data = await loadDocument({ documentUuid: 'abc' });

    expect(data.document).toBeNull();
    expect(data.flashcards).toEqual([]);
    expect(apiFetch.mock.calls.map((c) => String(c[0]))).not.toContain('/db');
  });

  it('assembles document, summary, flashcards and quizzes', async () => {
    mockBridge({
      Document: { data: { documentUuid: DOC, fileName: 'notes.pdf' } },
      DocumentSummary: { data: [{ summary: 'a summary' }] },
      Flashcard: { data: [{ flashcardUuid: 'f1' }] },
      Quiz: { data: [{ quizUuid: 'q1' }] },
    });

    const data = await loadDocument({ documentUuid: DOC });

    expect(data.document?.fileName).toBe('notes.pdf');
    expect(data.summary?.summary).toBe('a summary');
    expect(data.flashcards).toHaveLength(1);
    expect(data.quizzes).toHaveLength(1);
  });

  it('reports a missing document as not found, not an error', async () => {
    mockBridge({ Document: { data: null } });

    const data = await loadDocument({ documentUuid: DOC });

    expect(data.document).toBeNull();
    expect(data.summary).toBeNull();
  });
});

describe('loadSpace', () => {
  it('treats a malformed id as not found without querying', async () => {
    mockBridge({});

    const data = await loadSpace({ spaceId: 'nope' });

    expect(data.space).toBeNull();
    expect(apiFetch.mock.calls.map((c) => String(c[0]))).not.toContain('/db');
  });

  it('returns the folder with its chats, documents and members', async () => {
    apiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/me') return { user: USER };
      if (path === `/api/spaces/${DOC}/members`) {
        return {
          members: [
            { userUuid: USER.sub, email: 'a@curio.test', level: 0 },
            { userUuid: 'other', email: 'b@curio.test', level: 2 },
          ],
        };
      }
      if (path === '/db') {
        const body = JSON.parse(String(init?.body)) as { model: string; method: string };
        if (body.model === 'Space') return { data: { spaceUuid: DOC, name: 'Biology' } };
        if (body.model === 'Chat') return { data: [{ chatUuid: CHAT_A }] };
        if (body.model === 'Document') return { data: [{ documentUuid: DOC }] };
        return { data: [] };
      }
      return { data: null };
    });

    const data = await loadSpace({ spaceId: DOC });

    expect(data.space?.name).toBe('Biology');
    expect(data.chats).toHaveLength(1);
    expect(data.documents).toHaveLength(1);
    expect(data.members).toHaveLength(2);
    // The caller's own level decides whether the share controls render.
    expect(data.myLevel).toBe(0);
  });
});

describe('loadLibrary and loadSettings', () => {
  it('returns empty collections when signed out', async () => {
    apiFetch.mockResolvedValue(null);
    expect(await loadLibrary()).toEqual({
      user: null,
      documents: [],
      spaces: [],
    });
    expect(await loadSettings()).toEqual({ user: null, profile: null });
  });

  it('loads the library and the profile', async () => {
    mockBridge({
      Document: { data: [{ documentUuid: DOC, fileName: 'x.pdf' }] },
      Space: { data: [{ spaceUuid: DOC, name: 'Folder' }] },
      UserProfile: { data: { id: USER.sub, name: 'Test' } },
    });

    const library = await loadLibrary();
    expect(library.documents).toHaveLength(1);
    expect(library.spaces).toHaveLength(1);

    const settings = await loadSettings();
    expect(settings.profile?.name).toBe('Test');
  });
});

describe('loadProfile', () => {
  it('returns nulls when signed out', async () => {
    apiFetch.mockResolvedValue(null);
    expect(await loadProfile()).toEqual({ user: null, profile: null, subscription: null });
  });

  it('loads the profile and the newest subscription', async () => {
    mockBridge({
      UserProfile: { data: { id: USER.sub, firstName: 'Ada', lastName: 'Lovelace' } },
      CurioSubscription: { data: [{ subscriptionId: 's1', tier: 'ultra', status: 'active' }] },
    });

    const data = await loadProfile();

    expect(data.profile?.firstName).toBe('Ada');
    expect(data.subscription?.tier).toBe('ultra');
  });

  it('handles an account with no subscription', async () => {
    mockBridge({
      UserProfile: { data: { id: USER.sub } },
      CurioSubscription: { data: [] },
    });

    expect((await loadProfile()).subscription).toBeNull();
  });
});

describe('loadMetadata', () => {
  it('skips the query for a malformed target', async () => {
    mockBridge({});
    const data = await loadMetadata({ targetUuid: 'nope' });
    expect(data.metadata).toEqual([]);
    expect(apiFetch.mock.calls.map((c) => String(c[0]))).not.toContain('/db');
  });

  it('returns the rows for the target', async () => {
    mockBridge({ Metadata: { data: [{ metadataUuid: 'm1', name: 'subjectId' }] } });
    const data = await loadMetadata({ targetUuid: DOC });
    expect(data.metadata).toHaveLength(1);
    expect(data.metadata[0].name).toBe('subjectId');
  });
});
