'use client';

import { FileBrowser } from '../ui/file-browser/file-browser';
import { useDocumentsBrowser } from '@/hooks/use-documents-browser';
import { GeneralChat } from '@/components/core/general-chat';
import { useCreateGeneralChatApi } from '@/hooks/api/chats/use-create-general-chat.api';
import { AnimatedFileBrowser, BigTitle } from '../home/common';
import { motion } from 'framer-motion';
import { FadeSlideToggle, AppearFadeSlide, SwapFadeSlide } from '../ui/animations';
import { useState, useCallback, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSessionContext } from '@/providers/session-provider';
import { useSpaceContext } from '@/providers/space-provider';
import { FloatingNav } from '@/components/navigation/floating-nav';

interface SpaceLibraryProps {
  spaceUuid?: string;
}

export function SpaceLibrary({ spaceUuid }: SpaceLibraryProps) {
  const { hideExtras, onChatStarted } = useCreateGeneralChatApi({ spaceUuid: spaceUuid || null });
  const [documentUploadStarted, setDocumentUploadStarted] = useState(false);
  const [referencesEnabled, setReferencesEnabled] = useState(false);
  const { userAttributes } = useSessionContext();
  const { references, canWrite } = useSpaceContext();
  const readOnly = !canWrite;

  // Wrap onChatStarted to include document references when enabled
  const handleChatStarted = useCallback(async (message: string) => {
    await onChatStarted(message, {
      spaceDocumentUuids: referencesEnabled && references.length > 0
        ? references.map(ref => ref.id)
        : undefined,
    });
  }, [onChatStarted, referencesEnabled, references]);

  const onDocumentUploadStarted = () => {
    setDocumentUploadStarted(true);
  }

  const {
    files,
    isLoading: isLoadingFiles,
    handleDelete,
    handleMove,
    handleRemoveFromFolder,
    handleDocumentClick,
    handleSpaceSelect,
    handleCloseMoveToSpaceModal,
    isMoveToSpaceModalOpen,
    contextualFile,
    hasNextPage,
    loadNextPage,
  } = useDocumentsBrowser({ spaceUuid: spaceUuid || null });

  return (
    <main className="flex h-full flex-col items-center p-8 gap-4">
      <div className="flex-1 w-full max-w-3xl overflow-y-auto pb-12">
        <div className="space-y-12">
          {/* Welcome / Analyzing Text */}
          <SwapFadeSlide
            isFirstVisible={!documentUploadStarted}
            first={<BigTitle hideExtras={hideExtras} title={<>
              <div className="text-headers text-center font-regular text-4xl mb-8">
                Hi <span className="font-semibold text-gray-800">{userAttributes?.givenName}</span> 👋
              </div>
              What <span className='text-gray-800'>curio</span>sity do you want to explore today?
            </>} />}
            second={<BigTitle hideExtras={hideExtras} title={<div className="flex flex-col items-center gap-3">
              <span>Analyzing your document...</span>
              <Loader2 className="w-14 h-14 animate-spin" />
            </div>} />}
          />

          <motion.div
            layout
            transition={{ duration: 0.3 }}
            className={hideExtras ? 'absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 z-10' : ''}
          >
            {/* Space Document References */}
            {/* {spaceUuid && (
              <AppearFadeSlide>
                <SpaceDocumentReferences
                  spaceUuid={spaceUuid}
                  documents={documentsWithEmbeddings}
                  enabled={referencesEnabled}
                  onToggle={setReferencesEnabled}
                />
              </AppearFadeSlide>
            )} */}
            
            <FadeSlideToggle isVisible={!documentUploadStarted} className={cn(
              "flex flex-col gap-4",
            )}>            
              {/* General Chat */}
              <AppearFadeSlide>
                <GeneralChat 
                  onChatStarted={handleChatStarted} 
                  disabled={documentUploadStarted}
                  onDocumentUploadStarted={onDocumentUploadStarted}
                  defaultSpaceUuid={spaceUuid}
                  references={references}
                  readOnly={readOnly}
                />
              </AppearFadeSlide>
            </FadeSlideToggle>
          </motion.div>
        </div>

        <AnimatedFileBrowser hideExtras={hideExtras} title="Documents in this folder">
          <FileBrowser
            hideSpaceColumn={true}
            files={files}
            onDelete={handleDelete}
            onMove={handleMove}
            onRemoveFromFolder={handleRemoveFromFolder}
            onClick={handleDocumentClick}
            isLoading={isLoadingFiles}
            isMoveToSpaceModalOpen={isMoveToSpaceModalOpen}
            closeModal={handleCloseMoveToSpaceModal}
            handleSpaceSelect={handleSpaceSelect}
            contextualFile={contextualFile}
            hasNextPage={hasNextPage}
            loadNextPage={loadNextPage}
            readOnly={readOnly}
          />
        </AnimatedFileBrowser>
      </div>
      <FloatingNav readOnly={readOnly} />
    </main>
  );
}


