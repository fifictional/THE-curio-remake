import { useCallback, useState } from "react";
import Link from "next/link";
import { ActionMenu } from "./action-menu";
import { SpaceForm } from "../home/space-form";
import { useCreateSpaceApi, useRenameSpaceApi, useDeleteSpaceApi } from "@/hooks/api/spaces";
import { useAnalytics } from "@/providers";
import { 
  CurioListCardItem,
  CurioListCardItemIcon,
  CurioListCardItemHeader,
  CurioListCardItemTitle,
  CurioListCardItemSubtitle,
  CurioListCardItemAction
} from "@/design-system/curio-list-card-item";
import { Loader2, FolderIcon, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type SpaceCardProps = {
  spaceName: string;
  documentCount: number;
  spaceUuid: string | null;
  canDelete: boolean;
  canRename: boolean;
  isEditing: boolean;
  onEditCancel: () => void;
  onEditSave: () => void;
  onInvite?: () => void;
  isShared?: boolean;
  isSuperOwner?: boolean; // True if user owns the space AND it has been shared with others
  canInvite?: boolean;
}

export function SpaceCard({
  spaceName,
  documentCount,
  spaceUuid,
  canDelete,
  canRename,
  isEditing,
  onEditCancel,
  onEditSave,
  onInvite,
  isShared = false,
  isSuperOwner = false,
  canInvite = false,
}: SpaceCardProps) {
  const { createSpace, isCreatingSpace } = useCreateSpaceApi();
  const { renameSpace, isRenamingSpace } = useRenameSpaceApi();
  const { deleteSpace, isDeletingSpace } = useDeleteSpaceApi();
  const { track } = useAnalytics();

  const [isRenaming, setIsRenaming] = useState(false);

  const isSavingSpace = isCreatingSpace || isRenamingSpace || isDeletingSpace;
  
  const handleSaveSpace = useCallback(async ({ newName }: { newName: string }) => {
    if (!spaceUuid) {
      track('add-space-saved', {
        spaceName: newName,
      });
      await createSpace(newName);
    } else {
      track('rename-space-clicked', {
        spaceUuid,
        oldName: spaceName,
        newName,
      });
      await renameSpace({ spaceUuid, name: newName });
      setIsRenaming(false);
    }
    onEditSave();
  }, [isCreatingSpace, createSpace, renameSpace, spaceUuid, spaceName, onEditSave]);

  const handleDeleteSpace = useCallback(async () => {
    if (spaceUuid) {
      track('delete-space-clicked', {
        spaceUuid,
        spaceName,
      });
      await deleteSpace(spaceUuid);
    }
  }, [isDeletingSpace, deleteSpace, spaceUuid, spaceName]);

  const handleRenameSpace = useCallback(async () => {
    track('rename-space-clicked', {
      spaceUuid,
      spaceName,
    });
    setIsRenaming(true);
  }, []);

  const handleEditCancel = useCallback(() => {
    track('rename-space-canceled', {
      spaceUuid,
      spaceName,
    });
    setIsRenaming(false);
    onEditCancel();
  }, []);

  const handleCardClick = useCallback(() => {
    if (spaceUuid) {
      track('space-card-clicked', {
        spaceUuid,
        spaceName,
      });
    }
  }, [spaceUuid, spaceName, track]);

  const handleActionMenuClick = useCallback((e: React.MouseEvent) => {
    // Prevent card click when clicking on action menu
    e.stopPropagation();
    e.preventDefault();
  }, []);

  if (isEditing || isRenaming) {
    return <SpaceForm
      originalSpaceName={spaceName}
      isSaving={isSavingSpace}
      handleSaveSpace={handleSaveSpace}
      handleCancelSaveSpace={handleEditCancel}
    />
  }

  const cardContent = (
    <CurioListCardItem 
      border={true} 
      className={cn(
        "w-full sm:w-80 relative cursor-pointer",
        isDeletingSpace && "bg-red-50/80 dark:bg-red-950/20",
        spaceUuid && "hover:bg-gray-50/50 dark:hover:bg-gray-300/50 transition-colors"
      )}
      data-testid={`space-card-${spaceUuid}`}
    >
      <CurioListCardItemIcon icon={FolderIcon} />
      <CurioListCardItemHeader>
        <div className="flex items-center gap-2">
          <CurioListCardItemTitle data-testid={`space-card-name-${spaceUuid}`}>
            {spaceName}
          </CurioListCardItemTitle>
          {isShared && (
            <Users2 
              className="w-4 h-4 text-muted-foreground" 
              aria-label={isSuperOwner ? "Shared folder (you are the owner and can invite others)" : "Shared folder (you can invite others)"}
            />
          )}
        </div>
        <CurioListCardItemSubtitle data-testid={`space-card-document-count-${spaceUuid}`}>
          {documentCount} document{documentCount > 1 || documentCount === 0 ? 's' : ''}
        </CurioListCardItemSubtitle>
      </CurioListCardItemHeader>
      <CurioListCardItemAction onClick={handleActionMenuClick}>
        {isSavingSpace ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : (
          <ActionMenu
            actions={canInvite && onInvite ? ['invite', 'delete', 'rename'] : ['delete', 'rename']}
            item={spaceUuid || ''}
            canDelete={canDelete}
            canRename={canRename}
            canMove={false}
            canInvite={canInvite && !!onInvite}
            onDelete={handleDeleteSpace}
            onRename={handleRenameSpace}
            onInvite={onInvite}
            testIdPrefix={`space-card-${spaceUuid}`}
          />
        )}
      </CurioListCardItemAction>
    </CurioListCardItem>
  );

  // Only make clickable if spaceUuid exists (not a temp space being created)
  if (!spaceUuid) {
    return cardContent;
  }

  return (
    <Link href={`/spaces/${spaceUuid}`} onClick={handleCardClick}>
      {cardContent}
    </Link>
  );
}