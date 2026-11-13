import { InProgressUpload, useAnalytics, useCommonContext, useCoreContext, useSessionContext, useSpaceContext } from "@/providers";
import { useCallback, useState, useMemo } from "react";
import { useDeleteDocumentApi, useMoveDocumentApi } from "./api/documents";
import { useRouter } from "next/navigation";
import { StudentDocumentWithSummary } from "@/lib/types";
import { useDocumentsByUserOrSpaceApi } from "./api/documents";
import { useChatsByUserApi, useMoveChatApi } from "./api/chats";
import { useDeleteChatApi } from "./api/chats/use-delete-chat.api";
import { useChatsByUserOrSpaceApi } from "./api/chats/use-chats-by-user-or-space.api";
import { useSpaceApi } from "./api/spaces";

export type ContextualFile = {
  uuid: string;
  name: string;
  type: string;
}

// const getTags = (document: StudentDocumentWithSummary | InProgressUpload) => {
//   if ('documentSummaries' in document) {
//     const tags = document.documentSummaries?.[0]?.tags || [];
//     tags.sort((a, b) => a.localeCompare(b));
//     return tags;
//   }
//   return [];
// };

export const useDocumentsBrowser = ({ spaceUuid }: { spaceUuid: string | null }) => {
  const { track } = useAnalytics();
  const router = useRouter();

  const { inProgressUploads, processingDocumentsUuids, pendingDocumentsUuids, failedDocumentsUuids } = useCommonContext();
  const { userAttributes } = useSessionContext();
  const { space } = useSpaceApi(spaceUuid);

  const { documents, isLoading: isLoadingFiles, hasNextPage, loadNextPage, removeDocument } = useDocumentsByUserOrSpaceApi();
  const { chats, isLoading: isLoadingChats } = useChatsByUserOrSpaceApi();

  // Filter chats: in shared spaces (not owned by current user), only show current user's chats
  const filteredChats = useMemo(() => {
    // If we're in a space and user is NOT the actual owner of the chat, filter to only show current user's chats
    if (spaceUuid && userAttributes?.userUuid) {
      return chats.filter(chat => chat.userUuid === userAttributes.userUuid);
    }
    // Otherwise, show all chats (user's own space or no space)
    return chats;
  }, [chats, spaceUuid, space?.userUuid, userAttributes?.userUuid]);

  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [movingDocumentsUuids, setMovingDocumentsUuids] = useState<string[]>([]);

  const [isMoveToSpaceModalOpen, setIsMoveToSpaceModalOpen] = useState(false);
  const [contextualFile, setContextualFile] = useState<ContextualFile | null>(null);
  const { moveDocumentToSpace } = useMoveDocumentApi();
  const { moveChatToSpace } = useMoveChatApi();
  const { deleteDocument } = useDeleteDocumentApi();
  const { deleteChat } = useDeleteChatApi();
  const { setSpaceDocumentProcessing, setSpaceDocumentLoading } = useCoreContext()

  const mappedChats = filteredChats
    .filter(
      (chat) => chat.documentUuid === null
    ).map((chat) => ({
      ...chat,
      // to make it compatible with the document type
      documentUuid: chat.chatUuid,
      key: chat.chatUuid,
      originalKey: chat.chatUuid,
      fileName: chat.name,
      spaceName: chat.spaceName,
      spaceUuid: chat.spaceUuid,
      type: 'chat',
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      tags: [],
      isUploading: false,
      isDeleting: false,
      isMoving: false,
      isProcessing: false,
      isProcessingExtras: false,
      isPending: false,
      isFailed: false,
    }));

  const orderedChatsAndDocs = [...documents, ...mappedChats].sort((a, b) => new Date(b.createdAt || new Date()).getTime() - new Date(a.createdAt || new Date()).getTime());
  const allFiles = [...inProgressUploads, ...orderedChatsAndDocs];

  const files = allFiles.map((document) => ({
    id: document.documentUuid || document.key,
    key: document.key,
    originalKey: document.originalKey,
    name: document.fileName,
    spaceName: document.spaceName || 'No Folder',
    spaceUuid: document.spaceUuid || null,
    folder: document.type,
    type: document.type,
    date: new Date(document.createdAt || new Date()),
    tags: [], //getTags(document),
    userUuid: 'userUuid' in document ? document.userUuid : undefined,
    isUploading: !('documentUuid' in document),
    isDeleting: deletingIds.includes(document.documentUuid || document.key),
    isMoving: movingDocumentsUuids.includes(document.documentUuid || ''),
    isProcessing: processingDocumentsUuids.includes(document.documentUuid || ''),
    // isProcessingExtras: true if document is processing (not completed and not failed)
    // Everything that is not "processing" is completed (or failed), but we have a failed list for that
    isProcessingExtras: processingDocumentsUuids.includes(document.documentUuid || ''),
    isPending: pendingDocumentsUuids.includes(document.documentUuid || ''),
    isFailed: failedDocumentsUuids.includes(document.documentUuid || ''),
  }));

  setSpaceDocumentProcessing(files.some(item => item.isProcessing))
  setSpaceDocumentLoading(files.some(item => item.isUploading || item.isDeleting || item.isMoving))


  const onDelete = useCallback(async ({ id, type }: { id: string, type: string }) => {
    setDeletingIds([...deletingIds, id]);
    if (type === 'chat') {
      await deleteChat?.(id);
    } else {
      await deleteDocument?.(id);
    }
    setDeletingIds(deletingIds.filter((id) => id !== id));
  }, [deleteDocument, deleteChat, deletingIds]);

  const handleMove = useCallback(({ id, key, type }: { id: string, key: string, type: string }) => {
    track('move-document-clicked', {
      documentId: id,
      filename: key,
      type,
    });
    setContextualFile({
      uuid: id,
      name: key,
      type,
    });
    setIsMoveToSpaceModalOpen(true);
  }, [track]);

  const handleDelete = useCallback(({ id, type }: { id: string, type: string }) => {
    track('delete-document-clicked', {
      documentId: id,
    });
    onDelete({ id, type });
  }, [onDelete, track]);

  const handleDocumentClick = useCallback(({ id, spaceUuid, type }: { id: string, spaceUuid: string | null, type: string }) => {
    track('view-document-clicked', {
      documentId: id,
    });
    let url = spaceUuid ? `/spaces/${spaceUuid}` : '';

    if (type === 'chat') {
      url += `/chats/${id}`;
    } else if (type === 'youtube') {
      url += `/documents/${id}`;
    } else {
      url += `/documents/${id}`;
    }

    router.push(url);
  }, [router, track]);

  const handleSpaceSelect = useCallback(async (selectedSpaceUuid: string, spaceName: string) => {
    setIsMoveToSpaceModalOpen(false);
    track('move-document-to-space-clicked', {
      spaceUuid: selectedSpaceUuid,
      spaceName,
    });
    setMovingDocumentsUuids([...movingDocumentsUuids, contextualFile?.uuid || '']);
    if (contextualFile?.type === 'chat') {
      await moveChatToSpace(contextualFile?.uuid || '', selectedSpaceUuid);
    } else {
      await moveDocumentToSpace(contextualFile?.uuid || '', selectedSpaceUuid);
    }
    setMovingDocumentsUuids(movingDocumentsUuids.filter((uuid) => uuid !== contextualFile?.uuid));
    // remove document from the list (only if this is in the space page)
    if (spaceUuid) {
      removeDocument?.(contextualFile?.uuid || '');
    }
    setMovingDocumentsUuids(movingDocumentsUuids.filter((uuid) => uuid !== contextualFile?.uuid));
    setContextualFile(null);
  }, [track, moveDocumentToSpace, contextualFile]);

  const handleCloseMoveToSpaceModal = useCallback(() => {
    setIsMoveToSpaceModalOpen(false);
    setContextualFile(null);
  }, []);

  const handleRemoveFromFolder = useCallback(async ({ id, type }: { id: string, type: string }) => {
    track('remove-from-folder-clicked', {
      documentId: id,
      type,
    });
    setMovingDocumentsUuids([...movingDocumentsUuids, id]);
    try {
      if (type === 'chat') {
        await moveChatToSpace(id, null); // null = remove from folder
      } else {
        await moveDocumentToSpace(id, null); // null = remove from folder
      }
      // Remove document from the list (only if this is in the space page)
      if (spaceUuid) {
        removeDocument?.(id);
      }
    } catch (error) {
      console.error('Failed to remove from folder:', error);
    } finally {
      setMovingDocumentsUuids(movingDocumentsUuids.filter((uuid) => uuid !== id));
    }
  }, [track, moveDocumentToSpace, moveChatToSpace, spaceUuid, removeDocument, movingDocumentsUuids]);

  return {
    files,
    isLoading: isLoadingFiles,
    isMoveToSpaceModalOpen,
    handleDelete,
    handleMove,
    handleRemoveFromFolder,
    handleDocumentClick,
    handleSpaceSelect,
    contextualFile,
    handleCloseMoveToSpaceModal,
    hasNextPage,
    loadNextPage,
  };
};