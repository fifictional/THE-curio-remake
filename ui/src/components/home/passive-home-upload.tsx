'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, UploadIcon } from 'lucide-react';
import { useUpload } from '@/hooks/use-upload';
import { useCommonContext } from '@/providers';
import { CurioMarkdown } from '@/components/core/curio-markdown';
import { useDocumentLimit } from '@/hooks/use-document-limit';
import { useHasSpaceAccess } from '@/hooks/use-has-space-access';

export function PassiveHomeUpload({ defaultSpaceUuid }: { defaultSpaceUuid?: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const dragCounter = useRef(0);
  const { isUploadModalOpen } = useCommonContext();
  const { hasLimitExceed, hasDailyLimitExceed, message } = useDocumentLimit();
  const { canWrite, isLoading: isAccessLoading } = useHasSpaceAccess(defaultSpaceUuid || null);
  
  // Check if user has write access to the space (if spaceUuid is provided)
  const isReadOnly = defaultSpaceUuid ? !isAccessLoading && !canWrite : false;
  useEffect(() => {
    function hasFiles(e: DragEvent) {
      return Array.from(e.dataTransfer?.types || []).includes('Files');
    }

    function onDragEnter(e: DragEvent) {
      if (!hasFiles(e)) return;
      dragCounter.current += 1;
      setIsVisible(true);
    }

    function onDragOver(e: DragEvent) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setIsVisible(true);
    }

    function onDragLeave(e: DragEvent) {
      if (!hasFiles(e)) return;
      dragCounter.current = Math.max(0, dragCounter.current - 1);
      if (dragCounter.current === 0) {
        setIsVisible(false);
      }
    }
    if (!isUploadModalOpen) {
      window.addEventListener('dragenter', onDragEnter);
      window.addEventListener('dragover', onDragOver);
      window.addEventListener('dragleave', onDragLeave);
    } else {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
    }
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
    };
  }, [isUploadModalOpen]);

  const onUploadStarted = useCallback(() => {
    setIsUploading(true);
    setIsVisible(false);
    dragCounter.current = 0;
  }, []);

  const onUploadSuccess = useCallback(() => {
    setIsUploading(false);
    setIsVisible(false);
    dragCounter.current = 0;
  }, []);

  const onUploadFailed = useCallback(() => {
    setIsUploading(false);
    setIsVisible(false);
    dragCounter.current = 0;
  }, []);

  const {
    getRootProps,
    getInputProps,
    error
  } = useUpload({
    onDropCompleted: () => {
      onUploadStarted();
    }, onUploadStarted, onUploadSuccess, onUploadFailed, mode: 'all', defaultSpaceUuid
  });

  if (!isVisible && !isUploading) return null;

  return (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      // Prevent the browser from opening the file
      // Only enable drop functionality if not read-only
      {...(isReadOnly ? {
        onDragOver: (e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
        },
        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          // Discard dropped files when read-only and close modal
          setIsVisible(false);
          dragCounter.current = 0;
        }
      } : getRootProps())}
    >
      <div
        className="w-[90vw] max-w-3xl h-[320px] border-2 border-dashed rounded-xl bg-white/90 hover:bg-white transition-colors flex flex-col items-center justify-center p-6"
        style={{ cursor: hasLimitExceed || hasDailyLimitExceed || isReadOnly ? 'default' : 'pointer' }}
      >
        {(hasLimitExceed || hasDailyLimitExceed) ? (
          <div className="max-w-lg">
            <CurioMarkdown content={message} />
          </div>
        ) : isReadOnly ? (
          <div className="text-center text-gray-600">
            <p className="text-lg font-medium">You are not allowed to upload documents in this folder</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="text-center text-red-500 mb-4">
                {error}
              </div>
            )}
            {isUploading && (
              <div className="text-center text-gray-600 flex flex-col items-center justify-center">
                <span className="text-lg font-medium">Uploading...</span>
                <Loader2 className="w-12 h-12 text-gray-400 animate-spin" />
              </div>
            )}
            {!isUploading && (
              <>
                <input {...getInputProps()} />
                <UploadIcon className="w-12 h-12 text-gray-400 mb-4" />
                <div className="flex flex-col items-center justify-center">
                  <p className="text-center font-bold text-focus-text text-3xl">
                    Drop files.
                  </p>
                  <p className="text-3xl text-focus-text text-center font-bold">
                    Not your GPA.
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}


