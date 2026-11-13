'use client';

import { useState } from "react";
import * as Dialog from '@radix-ui/react-dialog';
import { Folder, X } from 'lucide-react';
import { useSpacesByUserApi } from "@/hooks/api/spaces";
import { CurioLoading } from "@/components/ui/curio-loading";
import { useAnalytics, useSessionContext } from "@/providers";

interface MoveToSpaceModalProps {
  isOpen: boolean;
  closeModal: () => void;
  onSpaceSelect: (spaceUuid: string, spaceName: string) => void;
  fileName?: string;
}

export function MoveToSpaceModal({ isOpen, closeModal, onSpaceSelect, fileName }: MoveToSpaceModalProps) {
  const [search, setSearch] = useState("");
  const { userAttributes } = useSessionContext();
  const { spaces, isLoading } = useSpacesByUserApi({ userUuid: userAttributes?.userUuid || null, options: {
    perPage: 100,
    subscriptions: 'all',
  } });
  const { track } = useAnalytics();

  const filteredSpaces = spaces.filter(space => 
    space.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (spaceUuid: string, spaceName: string) => {
    track('document-moved-to-space', {
      spaceUuid,
      spaceName,
      fileName: fileName || '',
    });
    onSpaceSelect(spaceUuid, spaceName);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      track('move-to-space-modal-opened', { fileName: fileName || '' });
    } else {
      track('move-to-space-modal-closed', { fileName: fileName || '' });
      closeModal();
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Title className="sr-only">Move to Folder</Dialog.Title>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <Dialog.Description id="move-to-space-description" className="sr-only">Select a folder to move the file to</Dialog.Description>
          
          <div className="flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Move to Folder</h2>
              {fileName && (
                <p className="text-sm text-gray-600 mt-1">Moving "{fileName}"</p>
              )}
            </div>

            {/* Search Input */}
            <div className="flex items-center border-b px-3">
              <input
                className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Search folders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
              <Dialog.Close className="rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-gray-100" onClick={closeModal}>
                <X className="h-4 w-4 text-gray-800" />
                <span className="sr-only">Close</span>
              </Dialog.Close>
            </div>

            {/* Spaces List */}
            <div className="overflow-y-auto max-h-[300px]">
              {isLoading ? (
                <div className="py-6 text-center">
                  <CurioLoading />
                </div>
              ) : filteredSpaces.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-800">
                  {search ? 'No folders found matching your search.' : 'No folders available.'}
                </div>
              ) : (
                <div className="px-1 py-2">
                  <div className="text-xs font-semibold text-gray-800 px-2 py-1.5">
                    Available Folders
                  </div>
                  {filteredSpaces.map((space) => (
                    <button
                      key={space.spaceUuid}
                      onClick={() => handleSelect(space.spaceUuid || '', space.name || 'Untitled Folder')}
                      className="relative flex w-full cursor-pointer text-gray-800 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                    >
                      <Folder className="mr-2 h-4 w-4 text-blue-600" />
                      <span className="font-medium">{space.name || 'Untitled Folder'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
} 