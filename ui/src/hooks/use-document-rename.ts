import { useCallback, useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAnalytics, useAmplifyUserApiClient } from '@/providers';

interface RenameContext {
  documentUuid: string;
  fileName: string;
  type: 'document' | 'chat';
}

export function useDocumentRename({ type }: { type: 'document' | 'chat' }) {
  const { track } = useAnalytics();
  const userApiClient = useAmplifyUserApiClient();
  const queryClient = useQueryClient();
  const [editedName, setEditedName] = useState('');
  const [renameContext, setRenameContext] = useState<RenameContext | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  
  const startRenaming = useCallback(({ documentUuid, fileName }: Omit<RenameContext, 'type'>) => {
    track('start-renaming-document', {documentUuid,fileName});
    setRenameContext({ documentUuid, fileName, type });
    setEditedName(fileName);
    setIsRenaming(true);
  }, [isRenaming]);

  const finishRenaming = useCallback((commit: boolean) => {
    var newFileName = editedName.trim();

    if (!renameContext) {
      console.error('No rename context found in stopRenaming');
      return;
    }

    let documentUuid = renameContext.documentUuid;
    let oldFileName = renameContext.fileName;
    let type = renameContext.type;

    track('stop-renaming-document', { documentUuid, oldFileName, newFileName, commit });
    setIsRenaming(false);
    if (commit && documentUuid && newFileName !== oldFileName) {
      if (type === 'document') {
        updateDocumentTitle({ newFileName, documentUuid });
      } else {
        updateChatTitle({ newFileName, chatUuid: documentUuid });
      }
    }
  }, [editedName, renameContext]);

  const handleNameChange = useCallback((newFileName: string) => {
    setEditedName(newFileName);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      finishRenaming(true);
    } else if (e.key === 'Escape') {
      finishRenaming(false);
    }
  }, [finishRenaming]);

  const { mutate: updateDocumentTitle } = useMutation({
    mutationFn: ({ newFileName, documentUuid }: { newFileName: string, documentUuid: string }) => {
      return userApiClient.models.Document.update({
        documentUuid,
        fileName: newFileName,
      });
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['document', variables.documentUuid] });
    },
  });

  const { mutate: updateChatTitle } = useMutation({
    mutationFn: ({ newFileName, chatUuid }: { newFileName: string, chatUuid: string }) => {
      return userApiClient.models.Chat.update({
        chatUuid,
        name: newFileName,
      });
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['chat', variables.chatUuid] });
    },
  });

  return {
    startRenaming,
    finishRenaming,
    handleNameChange,
    handleKeyDown,
    isRenaming,
    editedName,
  };
}
