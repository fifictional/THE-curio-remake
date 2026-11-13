import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAnalytics } from '@/providers';
import { useMoveDocumentApi } from '@/hooks/api/documents/use-move-document.api';
import { useMoveChatApi } from './api/chats';

export interface MoveContext {
  documentUuid: string;
  fileName: string;
  spaceUuid?: string | null;
  type: 'document' | 'chat';
}
  
export function useDocumentMove({ type }: { type: 'document' | 'chat' }) {
  const { track } = useAnalytics();
  const { moveDocumentToSpace } = useMoveDocumentApi();
  const { moveChatToSpace } = useMoveChatApi();
  const router = useRouter();
  const [isMoveToSpaceModalOpen, setIsMoveToSpaceModalOpen] = useState(false);
  const [moveContext, setMoveContext] = useState<MoveContext | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  const handleMove = useCallback(({ documentUuid, fileName, spaceUuid }: Omit<MoveContext, 'type'>) => {
    track('document-move-clicked', { documentUuid, fileName, spaceUuid: spaceUuid || null, type });
    setMoveContext({ documentUuid, fileName, spaceUuid, type });
    setIsMoveToSpaceModalOpen(true);
  }, [track]);

  const handleSpaceSelect = useCallback(async (selectedSpaceUuid: string, spaceName: string) => {
    if (!moveContext) {
      console.error('No move context found in handleSpaceSelect');
      return;
    }

    let documentUuid = moveContext.documentUuid;
    let fileName = moveContext.fileName;
    let spaceUuid = moveContext.spaceUuid;

    setIsMoveToSpaceModalOpen(false);
    track('document-moved-to-space', { documentUuid, fileName, spaceUuid: spaceUuid || null });

    setIsMoving(true);
    try {
      if (type === 'document') {
        await moveDocumentToSpace(documentUuid, selectedSpaceUuid);
      } else {
        await moveChatToSpace(documentUuid, selectedSpaceUuid);
      }
      
      // Navigate to the new space after moving
      router.push(`/spaces/${selectedSpaceUuid}/${type === 'document' ? 'documents' : 'chats'}/${documentUuid}`);
    } catch (error) {
      console.error('Failed to move document:', error);
    } finally {
      setIsMoving(false);
    }
    
    setMoveContext(null);
  }, [track, moveDocumentToSpace, moveContext]);

  const handleCloseMoveToSpaceModal = useCallback(() => {
    track('move-to-space-modal-closed', { fileName: moveContext?.fileName || '' });
    setIsMoveToSpaceModalOpen(false);
    setMoveContext(null);
  }, [track, moveContext]);

  return {
    handleMove,
    handleSpaceSelect,
    handleCloseMoveToSpaceModal,
    moveContext,
    isMoveToSpaceModalOpen,
    isMoving,
  };
}
