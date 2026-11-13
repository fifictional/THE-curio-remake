import { type Schema } from '@amplify/data/resource';
import { generateServerClientUsingCookies } from '@aws-amplify/adapter-nextjs/data';
import outputs from '../../../../amplify_outputs.json';
import { cookies } from 'next/headers';

export const cookieBasedClient = generateServerClientUsingCookies<Schema>({
  config: outputs,
  cookies,
});

/**
 * @deprecated Prefer `authorizeDocumentAccess()` + `cookieBasedClient`.
 *
 * Historically used to enforce owner-RLS on `Document` CRUD by routing calls
 * through Cognito userPool auth (AppSync then checks `caller.sub === Document.userUuid`).
 * That couples every API route to the caller having a valid Cognito JWT on the
 * SSR request — which fails with `"No federated jwt"` when the session cookies
 * aren't present (stale login, wrong `clientId` in `amplify_outputs.json`,
 * cross-origin cookie strip, companion mode, etc.).
 *
 * The Document model now again allows apiKey CRUD, so we enforce ownership
 * explicitly via `authorizeDocumentAccess()` below and keep the simpler apiKey
 * client for the actual AppSync calls.
 */
export const documentUserPoolClient = generateServerClientUsingCookies<Schema>({
  config: outputs,
  cookies,
  authMode: 'userPool',
});

export async function getUserId() {
  const cookieStore = await cookies();
  return cookieStore.get('userId')?.value;
}

export type DocumentAccessResult =
  | {
      ok: true;
      userId: string;
      document: {
        documentUuid: string;
        userUuid: string;
        spaceUuid: string | null;
      };
    }
  | { ok: false; status: 401 | 403 | 404; error: string };

/**
 * Authorize the current SSR caller for operations on a specific Document.
 *
 * Uses the `userId` session cookie (set by `SessionProvider` after Cognito
 * sign-in / companion pairing) and the apiKey client to look up the Document
 * plus any space membership. Returns `{ ok: true, userId, document }` when the
 * caller is either the owner or a member of the Document's space. Otherwise
 * returns an `{ ok: false, status, error }` payload that routes should map
 * directly to an HTTP response.
 *
 * Replaces the previous implicit "RLS via userPool client" pattern so routes
 * don't 500 with `"No federated jwt"` when the SSR request has no Cognito JWT.
 */
export async function authorizeDocumentAccess(
  documentUuid: string,
): Promise<DocumentAccessResult> {
  const userId = await getUserId();
  if (!userId) {
    return { ok: false, status: 401, error: 'Not authenticated' };
  }

  const doc = await cookieBasedClient.models.Document.get(
    { documentUuid },
    { selectionSet: ['documentUuid', 'userUuid', 'spaceUuid'] },
  );

  const data = doc.data;
  if (!data || !data.userUuid) {
    return { ok: false, status: 404, error: 'Document not found' };
  }

  if (data.userUuid === userId) {
    return {
      ok: true,
      userId,
      document: {
        documentUuid: data.documentUuid,
        userUuid: data.userUuid,
        spaceUuid: data.spaceUuid ?? null,
      },
    };
  }

  if (data.spaceUuid) {
    const shares = await cookieBasedClient.models.SpaceUsers.listSpaceUsersBySpaceUuidAndLevelAndCreatedAt(
      { spaceUuid: data.spaceUuid },
      { filter: { userUuid: { eq: userId } }, limit: 1 },
    );
    if ((shares.data || []).length > 0) {
      return {
        ok: true,
        userId,
        document: {
          documentUuid: data.documentUuid,
          userUuid: data.userUuid,
          spaceUuid: data.spaceUuid,
        },
      };
    }
  }

  return { ok: false, status: 403, error: 'Forbidden' };
}