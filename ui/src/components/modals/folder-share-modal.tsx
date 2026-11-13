'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X, Copy, Check } from 'lucide-react';
import { CurioButton } from '@/design-system/curio-button';
import { FolderShareModalContent } from './folder-share-modal-content';
import { useSharedFolder } from '@/hooks/use-shared-folder';
import { useState, useCallback, useMemo } from 'react';
import { useSessionContext } from '@/providers/session-provider';

export interface FolderShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceUuid: string | null;
  spaceName: string;
}

export function FolderShareModal({
  open,
  onOpenChange,
  spaceUuid,
  spaceName,
}: FolderShareModalProps) {
  const [emailInput, setEmailInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { members, isLoading: isLoadingMembers, invitesLeft, spaceOwnerUuid, addUser, removeUser, changePermission } = useSharedFolder(spaceUuid);
  const { userAttributes } = useSessionContext();

  // Determine if current user is an owner
  const currentUserIsOwner = useMemo(() => {
    if (!userAttributes?.userUuid) return false;
    const currentUserMember = members.find(m => m.uuid === userAttributes.userUuid);
    return currentUserMember?.role === 'Owner';
  }, [members, userAttributes?.userUuid]);

  const handleAddMember = useCallback(async () => {
    if (!emailInput.trim()) {
      setError('Email is required');
      return;
    }

    setError(null);
    const result = await addUser(emailInput.trim());
    
    if (result.success) {
      setEmailInput('');
    } else {
      setError(result.error || 'Failed to add user');
    }
  }, [emailInput, addUser]);

  const handleRemoveMember = useCallback(async (memberUuid: string) => {
    setError(null);
    const result = await removeUser(memberUuid);
    
    if (!result.success) {
      setError(result.error || 'Failed to remove user');
    }
  }, [removeUser]);

  const handleChangePermission = useCallback(async (memberUuid: string, newRole: 'Owner' | 'Editor' | 'Viewer') => {
    setError(null);
    const result = await changePermission(memberUuid, newRole);
    
    if (!result.success) {
      setError(result.error || 'Failed to change permission');
    }
  }, [changePermission]);

  const handleCopyLink = useCallback(async () => {
    if (!spaceUuid) return;
    
    // Generate the folder share link
    const folderLink = `${window.location.origin}/spaces/${spaceUuid}`;
    
    try {
      await navigator.clipboard.writeText(folderLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  }, [spaceUuid]);

  const handleDone = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        <Dialog.Content
          className="
            fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            w-[90vw] max-w-2xl rounded-2xl bg-white p-6 shadow-xl
            focus:outline-none
            duration-200
            data-[state=open]:animate-in
            data-[state=closed]:animate-out
            data-[state=closed]:fade-out-0
            data-[state=open]:fade-in-0
            data-[state=closed]:zoom-out-95
            data-[state=open]:zoom-in-95
            data-[state=closed]:slide-out-to-bottom-4
            data-[state=open]:slide-in-from-bottom-4
          "
        >
          {/* Close Button */}
          <Dialog.Close asChild>
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition hover:cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </Dialog.Close>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold">
              Share "{spaceName}"
            </h2>
          </div>

          {/* Content */}
          {isLoadingMembers ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Loading members...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              <FolderShareModalContent
                emailInput={emailInput}
                members={members}
                invitesLeft={invitesLeft}
                currentUserIsOwner={currentUserIsOwner}
                spaceOwnerUuid={spaceOwnerUuid}
                currentUserUuid={userAttributes?.userUuid || null}
                onInputChange={(value) => {
                  setEmailInput(value);
                  setError(null); // Clear error when user types
                }}
                onAdd={handleAddMember}
                onRemove={handleRemoveMember}
                onChangePermission={handleChangePermission}
              />
            </>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border mt-6">
            <CurioButton
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </>
              )}
            </CurioButton>
            <CurioButton
              color="primary"
              size="sm"
              onClick={handleDone}
            >
              Done
            </CurioButton>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
