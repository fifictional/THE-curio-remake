import { useAmplifyApiClient } from "@/providers";
import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export const useRenameSpaceApi = () => {
  const apiClient = useAmplifyApiClient();
  const queryClient = useQueryClient();
  const [isRenamingSpace, setIsRenamingSpace] = useState(false);
 
  const renameSpace = useCallback(async ({ spaceUuid, name }: { spaceUuid: string, name: string }) => {
    setIsRenamingSpace(true);
    await apiClient.models.Space.update({
      spaceUuid,
      name,
      }, {
        selectionSet: ['spaceUuid', 'name', 'userUuid', 'updatedAt', 'createdAt', 'documents.documentUuid'],
    });
    setIsRenamingSpace(false);
    queryClient.invalidateQueries({ queryKey: ['space', spaceUuid] });
    // Also invalidate paginated document queries so FileBrowser reflects updated space names
    queryClient.invalidateQueries({ queryKey: ['pag-query', 'documents'] });
    queryClient.invalidateQueries({ queryKey: ['documents'] });
  }, []);

  return { renameSpace, isRenamingSpace };
}