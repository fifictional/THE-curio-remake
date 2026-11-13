'use client';

import { FileIcon, Loader2, Cog, X, MessageCircleIcon, YoutubeIcon, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { MoveToSpaceModal } from '../../modals/move-to-space-modal';
import { FileItem } from './file-item';
import { LoadingPart } from './loading-part';
import { NoFilesPart } from './no-files-part';
import { useFileBrowser } from '@/hooks/use-file-browser';
import { ContextualFile } from '@/hooks/use-documents-browser';
import { ActionMenu } from '../action-menu';
import { useCommonContext } from '@/providers/common-provider';
import { useSessionContext } from '@/providers/session-provider';
import { useSpaceContextSafe } from '@/providers/space-provider';

interface FileBrowserProps {
  isLoading: boolean;
  hideSpaceColumn: boolean;
  files?: FileItem[];
  onDelete: (item: { id: string, type: string }) => void;
  onMove: (item: { id: string, key: string, type: string }) => void;
  onRemoveFromFolder?: (item: { id: string, type: string }) => void;
  onClick: (item: { id: string, spaceUuid: string | null, type: string }) => void;
  isMoveToSpaceModalOpen: boolean;
  closeModal: () => void;
  handleSpaceSelect: (spaceUuid: string, fileName: string) => void;
  contextualFile: ContextualFile | null;
  hasNextPage: boolean;
  loadNextPage: () => void;
  readOnly?: boolean;
}

export function FileBrowser({ 
  isLoading,
  hideSpaceColumn,
  files = [],
  onDelete,
  onMove,
  onRemoveFromFolder,
  onClick,
  isMoveToSpaceModalOpen,
  closeModal,
  handleSpaceSelect,
  contextualFile,
  hasNextPage,
  loadNextPage,
  readOnly = false,
}: FileBrowserProps) {
  const {
    selectedFiles,
    toggleSelect,
    toggleSelectAll,
  } = useFileBrowser({ files });
  const { isMobile } = useCommonContext();
  const { userAttributes } = useSessionContext();
  const spaceContext = useSpaceContextSafe();

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full divide-y divide-gray-200 table-fixed">
        <thead>
          <tr className="bg-file-browser-header">
            {/* <th scope="col" className="w-8 py-2 pl-4 rounded-tl-xl">
              <Checkbox 
                onClick={toggleSelectAll} 
                checked={!isLoading && selectedFiles.length === files.length && files.length > 0}
                disabled={isLoading}
              />
            </th> */}
            <th scope="col" className="px-4 py-2 text-left text-sm text-gray-600 w-3/4 md:w-1/2">Name</th>
            {!hideSpaceColumn && !isMobile && <th scope="col" className="px-4 py-2 text-left text-sm text-gray-600 w-1/4">Folder</th>}
            {!isMobile && <th scope="col" className="w-32 px-4 py-2 text-left text-sm text-gray-600">Date</th>}
            <th scope="col" className="w-10 px-4 py-2 rounded-tr-xl"></th>
          </tr>
        </thead>
        <tbody className="w-full bg-white divide-y divide-gray-200">
          {isLoading && files.length === 0 && <LoadingPart hideSpaceColumn={hideSpaceColumn} isMobile={isMobile} />}
          {!isLoading && files.length === 0 && <NoFilesPart colSpan={isMobile ? 2 : hideSpaceColumn ? 3 : 4} />}
          {files.length > 0 && files.map((file: FileItem) => {
            const isDisabled = file.isUploading || file.isDeleting || file.isMoving;
            const showSpinner = file.isUploading || file.isDeleting || file.isMoving;

            const icon = file.type === 'chat' ? (
              <MessageCircleIcon className="h-5 w-5 text-gray-400" />
            ) : file.type === 'youtube' ? (
              <YoutubeIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <FileIcon className="h-5 w-5 text-gray-400" />
            );
            
            return (
              <tr
                key={file.id}
                className={cn(
                  "hover:bg-gray-50",
                  !isDisabled && "cursor-pointer",
                  isDisabled && "opacity-60"
                )}
                onClick={() => {
                  if (!isDisabled && file.key && onClick) {
                    onClick({ id: file.id, spaceUuid: file.spaceUuid, type: file.type });
                  }
                }}
              >
                {/* <td className="w-8 py-3 pl-4" onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    disabled={isDisabled} 
                    checked={selectedFiles.includes(file.id)} 
                    onClick={(e) => toggleSelect(e, file.id)}
                  />
                </td> */}
                <td className="min-w-0 px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {showSpinner ? (
                      <Loader2 className="h-5 w-5 text-gray-400 animate-spin shrink-0" />
                    ) : file.isProcessing ? (
                      <div className="relative shrink-0">
                        {icon}
                        <Cog className="h-3.5 w-3.5 text-blue-500 animate-spin absolute -bottom-1 -right-1" />
                      </div>
                    ) : file.isPending ? (
                      <div className="relative shrink-0">
                        {icon}
                        <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin absolute -bottom-1 -right-1" />
                      </div>
                    ) : file.isFailed ? (
                      <div className="relative shrink-0">
                        {icon}
                        <X className="h-3.5 w-3.5 text-red-500 absolute -bottom-1 -right-1" />
                      </div>
                    ) : (
                      <div className="shrink-0">{icon}</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>{file.name}</p>
                        {(() => {
                          // Only show ownership icon in shared spaces (when spaceContext exists and has spaceUuid)
                          // And only for files owned by the current user
                          const isInSharedSpace = !!spaceContext?.spaceUuid;
                          const isFileOwnedByUser = file.userUuid === userAttributes?.userUuid;
                          const shouldShowIcon = isInSharedSpace && isFileOwnedByUser;
                          
                          return shouldShowIcon ? (
                            <span title="You own this item" className="shrink-0">
                              <User 
                                className="h-3.5 w-3.5 text-muted-foreground" 
                              />
                            </span>
                          ) : null;
                        })()}
                      </div>
                      <div className="text-xs text-gray-500 flex flex-wrap gap-1">
                        <span>{file.isProcessing ? 'Processing document... - ' : ''}</span>
                        <span>{isMobile && file.spaceName && `${file.spaceName}`}</span>
                        <span>{isMobile && file.date && ` - ${format(file.date, 'MMM dd, yyyy')}`}</span>
                      </div>
                    </div>
                  </div>
                </td>
                {!hideSpaceColumn && !isMobile && (
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div className="truncate" title={file.spaceName || undefined}>{file.spaceName}</div>
                  </td>
                )}
                {!isMobile && <td className="w-32 px-4 py-3 text-sm text-gray-600">
                  {format(file.date, 'MMM dd, yyyy')}
                </td>}
                <td className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  {!isDisabled && (
                    <div className="flex justify-end">
                      {(() => {
                        const isFileOwnedByUser = file.userUuid === userAttributes?.userUuid;
                        const isEditorOrOwner = spaceContext?.canWrite || false;
                        
                        // If user is editor/owner in a space and file is NOT owned by them, show "Remove from folder"
                        const shouldShowRemoveFromFolder = isEditorOrOwner && !isFileOwnedByUser && !!spaceContext?.spaceUuid;
                        
                        // Allow delete/move for user's own files (any type) even when readOnly is true
                        const canDeleteFile = (isFileOwnedByUser || !readOnly) && !file.isProcessing && !file.isPending && !file.isUploading && !file.isDeleting && !file.isMoving;
                        const canMoveFile = (isFileOwnedByUser || !readOnly) && !file.isProcessing && !file.isPending && !file.isUploading && !file.isDeleting && !file.isFailed && !file.isMoving;
                        const canRemoveFromFolder = shouldShowRemoveFromFolder && !file.isProcessing && !file.isPending && !file.isUploading && !file.isDeleting && !file.isMoving;
                        
                        if (shouldShowRemoveFromFolder) {
                          return (
                            <ActionMenu
                              actions={['removeFromFolder']}
                              item={file}
                              canRemoveFromFolder={canRemoveFromFolder}
                              onRemoveFromFolder={() => onRemoveFromFolder?.({ id: file.id, type: file.type })}
                              canDelete={false}
                              canMove={false}
                              canRename={false}
                            />
                          );
                        }
                        
                        return (
                          <ActionMenu
                            actions={['delete', 'move']}
                            item={file}
                            canDelete={canDeleteFile}
                            canMove={canMoveFile}
                            onDelete={() => onDelete({ id: file.id, type: file.type })}
                            onMove={() => onMove({ id: file.id, key: file.key, type: file.type })}
                            canRename={false}
                          />
                        );
                      })()}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
          {isLoading && files.length > 0 && <LoadingPart hideSpaceColumn={hideSpaceColumn} isMobile={isMobile} />}
          {!isLoading && hasNextPage && (
            <tr>
              <td colSpan={isMobile ? 2 : hideSpaceColumn ? 3 : 4} className="px-4 py-3 text-center cursor-pointer hover:bg-gray-200" onClick={(e) => {
                e.stopPropagation();
                loadNextPage();
              }}>
                <button>Load more</button>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <MoveToSpaceModal
        isOpen={isMoveToSpaceModalOpen}
        closeModal={closeModal}
        onSpaceSelect={handleSpaceSelect}
        fileName={contextualFile?.name || ''}
      />
    </div>
  );
}