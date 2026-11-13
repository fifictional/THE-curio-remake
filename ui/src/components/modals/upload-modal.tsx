'use client';

import { Dialog, VisuallyHidden } from '@radix-ui/themes';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUploadDocumentApi } from '@/hooks/api/documents';
import { QRCodeSVG } from 'qrcode.react';
import { useDropzone } from 'react-dropzone';
import { UploadIcon } from 'lucide-react';
import { useCommonContext } from '@/providers/common-provider';
import { useAnalytics, useSessionContext } from '@/providers';
import { PDFDocument } from 'pdf-lib';
import { useRouter } from "next/navigation";
import { useUpload } from '@/hooks/use-upload';
import { CurioMarkdown } from '@/components/core/curio-markdown';
import { useDocumentLimit } from '@/hooks/use-document-limit';
import { parseOptionalSpaceUuid } from '@/lib/utils/space-uuid';

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userUuid: string;
  mode?: 'all' | 'image' | 'pdf';
  defaultSpaceUuid?: string;
  onUploadStarted: () => void;
}

export function UploadModal({ open, onOpenChange, userUuid, mode = 'all', defaultSpaceUuid, onUploadStarted }: UploadModalProps) {
  const { userAttributes } = useSessionContext();
  const { setIsUploadModalOpen, isUploadModalOpen } = useCommonContext();
  const { hasLimitExceed, hasDailyLimitExceed, message } = useDocumentLimit()
  // Generate companion URL for QR code (omit spaceUuid when unset — avoid literal "undefined" in query string)
  const companionUrl = typeof window !== 'undefined'
    ? (() => {
        const params = new URLSearchParams();
        if (userAttributes?.userUuid) {
          params.set('userUuid', userAttributes.userUuid);
        }
        const space = parseOptionalSpaceUuid(defaultSpaceUuid ?? null);
        if (space) {
          params.set('spaceUuid', space);
        }
        return `${window.location.origin}/companion/upload?${params.toString()}`;
      })()
    : '';

  useEffect((
  ) => {
    setIsUploadModalOpen(open)
  }, [open]);
  const onDropCompleted = useCallback(() => {
    onOpenChange(false);
    onUploadStarted();
  }, [onOpenChange, onUploadStarted]);

  const {
    error,
    getRootProps,
    getInputProps,
    isDragActive
  } = useUpload({ defaultSpaceUuid, onDropCompleted, mode });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <VisuallyHidden>
        <Dialog.Title>Upload Document</Dialog.Title>
      </VisuallyHidden>
      <Dialog.Content aria-describedby='upload-modal' style={{ '--dialog-content-padding': '0px', maxWidth: '900px', maxHeight: '800px' } as React.CSSProperties}>
        <div className="flex">
          {/* Left side - Upload from device */}
          <div className={`w-full p-6 ${!hasDailyLimitExceed && !hasLimitExceed ? 'sm:w-1/2' : ''}`}>
            <h3 className="text-lg font-medium text-headers mb-4 text-center">
              From your device
            </h3>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md mb-4">
                {error}
              </p>
            )}

            {hasDailyLimitExceed || hasLimitExceed ? (
              <div className="flex flex-col items-center justify-center w-full h-[400px] border-2 border-gray-300 rounded-xl bg-gray-50 p-6">
                <CurioMarkdown content={message} />
              </div>
            ) : (
              <div
                {...getRootProps()}
                data-testid="upload-modal-drop-area"
                className={`flex flex-col items-center justify-center w-full h-[400px] border-2 border-dashed rounded-xl transition-colors cursor-pointer
                  ${isDragActive
                    ? 'border-gray-500 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400 bg-gray-50'}`}
              >
                <input {...getInputProps()} data-testid="upload-modal-file-input" />
                <UploadIcon className="w-12 h-12 text-gray-400 mb-4" />
                <div className="flex flex-col items-center justify-center">
                  <p className="text-center font-bold text-focus-text text-3xl">
                    Drop files.
                  </p>
                  <p className="text-3xl text-focus-text text-center font-bold">
                    Not your GPA.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right side - QR Code */}
          {!hasDailyLimitExceed && !hasLimitExceed && (
            <div className="sm:block hidden w-1/2 border-l border-gray-200 p-6 bg-gray-50/50">
              <h3 className="text-lg font-medium text-headers mb-4 text-center">
                From your phone
              </h3>
              <div className="flex flex-col items-center justify-center h-[400px]">
                <p className="text-gray-500 text-center mb-8 max-w-sm">
                  Scan this QR code with your phone's camera to upload documents directly from your mobile device
                </p>
                <div className="flex justify-center p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <QRCodeSVG
                    value={companionUrl}
                    size={200}
                    level="H"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
} 