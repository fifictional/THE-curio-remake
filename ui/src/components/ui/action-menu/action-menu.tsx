import { CurioDropdown } from "@/design-system/curio-dropdown";
import { CurioDropdownContentListItem } from "@/design-system/curio-dropdown-content-list-item";
import { CurioDropdownContentDeleteListItem } from "@/design-system/curio-dropdown-content-delete-list-item";
import { ArrowRight, MoreVertical, Pencil, UserPlus, FolderX } from "lucide-react";
import { useCallback } from 'react';

interface ActionMenuProps<T> {
  item: T;
  actions: ('delete' | 'move' | 'rename' | 'invite' | 'removeFromFolder')[];
  onDelete?: (item: T) => void;
  onMove?: (item: T) => void;
  onRename?: (item: T) => void;
  onInvite?: (item: T) => void;
  onRemoveFromFolder?: (item: T) => void;
  canDelete: boolean;
  canMove: boolean;
  canRename: boolean;
  canInvite?: boolean;
  canRemoveFromFolder?: boolean;
  renameText?: string;
  testIdPrefix?: string;
}
  
export function ActionMenu<T>({ actions, item, onDelete, onMove, onRename, onInvite, onRemoveFromFolder, canDelete, canMove, canRename, canInvite = true, canRemoveFromFolder = false, renameText, testIdPrefix = 'action-menu' }: ActionMenuProps<T>) {
  const handleDelete = useCallback(() => {
    if (!canDelete) return;
    // The delete item handles confirmation internally, so we just call onDelete directly
    onDelete?.(item);
  }, [onDelete, item, canDelete]);

  const handleRename = useCallback(() => {
    if (!canRename) return;
    onRename?.(item);
  }, [onRename, item, canRename]);

  const handleMove = useCallback(() => {
    if (!canMove) return;
    onMove?.(item);
  }, [onMove, item, canMove]);

  const handleInvite = useCallback(() => {
    if (!canInvite) return;
    onInvite?.(item);
  }, [onInvite, item, canInvite]);

  const handleRemoveFromFolder = useCallback(() => {
    if (!canRemoveFromFolder) return;
    onRemoveFromFolder?.(item);
  }, [onRemoveFromFolder, item, canRemoveFromFolder]);

  return (
    <CurioDropdown
      icon={<MoreVertical className="h-5 w-5" data-testid={`${testIdPrefix}-trigger`} />}
    >
      {actions.includes('invite') && (
        <CurioDropdownContentListItem
          icon={<UserPlus className="h-4 w-4" />}
          onClick={handleInvite}
          disabled={!canInvite}
          data-testid={`${testIdPrefix}-invite`}
        >
          Invite
        </CurioDropdownContentListItem>
      )}

      {actions.includes('move') && (
        <CurioDropdownContentListItem
          icon={<ArrowRight className="h-4 w-4" />}
          onClick={handleMove}
          disabled={!canMove}
          data-testid={`${testIdPrefix}-move`}
        >
          Move...
        </CurioDropdownContentListItem>
      )}

      {actions.includes('rename') && (
        <CurioDropdownContentListItem
          icon={<Pencil className="h-4 w-4" />}
          onClick={handleRename}
          disabled={!canRename}
          data-testid={`${testIdPrefix}-rename`}
        >
          {renameText || 'Rename'}
        </CurioDropdownContentListItem>
      )}

      {actions.includes('removeFromFolder') && (
        <CurioDropdownContentListItem
          icon={<FolderX className="h-4 w-4" />}
          onClick={handleRemoveFromFolder}
          disabled={!canRemoveFromFolder}
          data-testid={`${testIdPrefix}-remove-from-folder`}
        >
          Remove from folder
        </CurioDropdownContentListItem>
      )}

      {actions.includes('delete') && (
        <CurioDropdownContentDeleteListItem
          onDelete={handleDelete}
          disabled={!canDelete}
          data-testid={`${testIdPrefix}-delete`}
        />
      )}
    </CurioDropdown>
  );
}
