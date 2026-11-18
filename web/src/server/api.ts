/**
 * Server functions for the first paint.
 *
 * Thin wrappers only: the logic lives in `loaders.ts`, which has no framework
 * dependency and is unit tested. These exist to run it on the server (and over
 * RPC when the client navigates), so the session cookie never has to exist in
 * the browser bundle for SSR to work.
 */

import { createServerFn } from '@tanstack/react-start';

import {
  loadChatPageData,
  loadDocumentData,
  loadLibraryData,
  loadSettingsData,
  loadSpaceData,
  type ChatPageData,
  type DocumentPageData,
  type LibraryData,
  type SettingsData,
  type SpacePageData,
} from './loaders';

export type {
  ChatPageData,
  DocumentPageData,
  LibraryData,
  SettingsData,
  SpacePageData,
};

export const loadChatPage = createServerFn({ method: 'GET' })
  .validator((data: { chatUuid?: string }) => data)
  .handler(({ data }): Promise<ChatPageData> => loadChatPageData(data));

export const loadLibrary = createServerFn({ method: 'GET' }).handler(
  (): Promise<LibraryData> => loadLibraryData(),
);

export const loadDocument = createServerFn({ method: 'GET' })
  .validator((data: { documentUuid: string }) => data)
  .handler(({ data }): Promise<DocumentPageData> => loadDocumentData(data));

export const loadSpace = createServerFn({ method: 'GET' })
  .validator((data: { spaceId: string }) => data)
  .handler(({ data }): Promise<SpacePageData> => loadSpaceData(data));

export const loadSettings = createServerFn({ method: 'GET' }).handler(
  (): Promise<SettingsData> => loadSettingsData(),
);
