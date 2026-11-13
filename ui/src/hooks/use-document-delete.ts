import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAnalytics } from '@/providers';
import { useDeleteDocumentApi } from '@/hooks/api/documents/use-delete-document.api';
import { useDeleteChatApi } from './api/chats/use-delete-chat.api';

interface DeleteContext {
    documentUuid: string;
    spaceUuid?: string | null;
  }
  
export function useDocumentDelete({ type }: { type: 'document' | 'chat' }) {
  const { track } = useAnalytics();
  const { deleteDocument } = useDeleteDocumentApi();
  const { deleteChat } = useDeleteChatApi();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleDelete = useCallback(async ({ documentUuid, spaceUuid }: DeleteContext) => {
    track('document-delete-clicked', { documentUuid, spaceUuid: spaceUuid || null, type });

    setIsDeleting(true);
    try {
      if (type === 'document') {
        await deleteDocument(documentUuid);
      } else {
        await deleteChat(documentUuid);
      }
      
      // Navigate back to appropriate location after deletion
      if (spaceUuid) {
        router.push(`/spaces/${spaceUuid}/${type === 'document' ? 'documents' : 'chats'}/${documentUuid}`);
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteDocument, deleteChat, track, router]);

  return {
    handleDelete,
    isDeleting,
  };
}
