"use client";

import { FileBrowser } from '@/components/ui/file-browser/file-browser';
import { SpaceSection } from '@/components/home/space-section';
import { useDocumentsBrowser } from '@/hooks/use-documents-browser';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedFileBrowser, AnimatedHomeUpload } from '@/components/home/common';
import { PassiveHomeUpload } from '@/components/home/passive-home-upload';
import { FloatingNav } from '@/components/navigation/floating-nav';

export default function Home() {
  const {
    files,
    isLoading: isLoadingFiles,
    handleDelete,
    handleMove,
    handleDocumentClick,
    handleSpaceSelect,
    handleCloseMoveToSpaceModal,
    isMoveToSpaceModalOpen,
    contextualFile,
    hasNextPage,
    loadNextPage,
  } = useDocumentsBrowser({ spaceUuid: null });

  // TODO: Get actual user UUID from auth context
  return (
    <main className="relative flex h-full flex-col items-center p-8 gap-4">
      <div className="flex-1 w-full max-w-3xl overflow-y-auto pb-12">
        {/* Spaces */}
        <AnimatePresence>
          <motion.div
            className="w-full"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25 }}
          >
            <SpaceSection />
          </motion.div>
        </AnimatePresence>

        {/* Pick up from where you left off */}
        <AnimatedFileBrowser hideExtras={false} title="Your library">
          <FileBrowser 
            hideSpaceColumn={false} 
            files={files}
            onDelete={handleDelete}
            onMove={handleMove}
            onClick={handleDocumentClick}
            isLoading={isLoadingFiles}
            isMoveToSpaceModalOpen={isMoveToSpaceModalOpen}
            closeModal={handleCloseMoveToSpaceModal}
            handleSpaceSelect={handleSpaceSelect}
            contextualFile={contextualFile}
            hasNextPage={hasNextPage}
            loadNextPage={loadNextPage}
          />
        </AnimatedFileBrowser>
      </div>
      <FloatingNav />
    </main>
  );
}
