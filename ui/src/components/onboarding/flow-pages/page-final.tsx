"use client";

import { useCommonContext } from "@/providers/common-provider";
import { AnimatePresence, motion } from "framer-motion";
import { PageFlowProps } from "../types";
import { useMockDocumentsApi } from "@/hooks/api/mock-documents/use-mock-documents.api";
import { useCallback, useMemo, useState } from "react";
import { FileText, Youtube } from "lucide-react";
import { OnboardingPage } from "../onboarding-page";

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.4 } },
} as const;

export const PageFinal = ({ onFinish, onSkip }: PageFlowProps) => {
  const { isMobile } = useCommonContext();
  const { mockDocuments, isLoading } = useMockDocumentsApi();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedDoc = useMemo(() => 
    mockDocuments?.find((d) => d.mockDocumentUuid === selectedId) || null, [mockDocuments, selectedId]);

  const onDocumentConfirmed = useCallback(() => {
    if (selectedDoc) {
      onFinish({ docUuid: selectedDoc.documentUuid });
    }
  }, [onFinish, selectedDoc]);

  return (
    <motion.div key="p-final" variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <OnboardingPage 
        line1={`Lets get you`}
        withCurio 
        curioSuffix="us" 
        bubbleText="see how Curio works" 
        onFinished={() => {}} 
        isMobile={isMobile} 
        bubbleRightMobile={-10} 
        bubbleRightDesktop={-50} 
      />

      <div className="mt-10 px-4">
        {isLoading ? (
          <div className="text-center text-sm text-gray-600">Loading documents…</div>
        ) : (
          <AnimatePresence mode="wait">
            {selectedDoc ? (
              <motion.div
                key="selected"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="mx-auto flex w-full max-w-[800px] flex-col items-center text-center"
              >
                <div className={`group rounded-xl border w-56 md:w-72 aspect-square overflow-hidden mb-4`}>
                  <div className="flex h-full w-full flex-col">
                    <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                      {selectedDoc.youtube ? (
                        <Youtube className="h-6 w-6 text-red-600 flex-shrink-0" />
                      ) : (
                        <FileText className="h-6 w-6 text-gray-700 flex-shrink-0" />
                      )}
                      <div className="min-w-0 text-left text-sm font-medium text-gray-900 truncate" title={selectedDoc.title}>
                        {selectedDoc.title}
                      </div>
                    </div>
                    <div className="relative flex-1">
                      <div className="absolute inset-0 overflow-hidden bg-gray-100">
                        <img
                          src={selectedDoc.thumbnailKey || "/doc_thumb.png"}
                          alt={selectedDoc.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <p className="mb-6 max-w-[560px] text-sm text-gray-600">{selectedDoc.description}</p>
                <div className="flex items-center gap-3">
                  <button
                    className="rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                    onClick={onDocumentConfirmed}
                  >
                    I choose this
                  </button>
                  <button
                    className="rounded-full border border-gray-900/30 px-4 py-2 text-sm text-gray-700 hover:border-gray-900 hover:text-gray-900 transition-colors"
                    onClick={() => setSelectedId(null)}
                  >
                    Wait...
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="mx-auto w-fit grid grid-cols-2 gap-6 md:grid-cols-2"
              >
                {mockDocuments?.slice(0, 8).map((doc) => {
                  const isSelected = selectedId === doc.mockDocumentUuid;
                  const thumb = doc.thumbnailKey || "/doc_thumb.png";
                  return (
                    <motion.button
                      key={doc.mockDocumentUuid}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      className={`group rounded-xl border transition-colors cursor-pointer ${isSelected ? 'border-gray-900 ring-2 ring-gray-900' : 'border-gray-600/20'} w-48 md:w-64 aspect-square overflow-hidden`}
                      onClick={() => setSelectedId(isSelected ? null : doc.mockDocumentUuid)}
                    >
                      <div className="flex h-full w-full flex-col">
                        <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                          {doc.youtube ? (
                            <Youtube className="h-6 w-6 text-red-600 flex-shrink-0" />
                          ) : (
                            <FileText className="h-6 w-6 text-gray-700 flex-shrink-0" />
                          )}
                          <div className="min-w-0 text-left text-sm font-medium text-gray-900 truncate" title={doc.title}>
                            {doc.title}
                          </div>
                        </div>
                        <div className="relative flex-1">
                          <div className="absolute inset-0 overflow-hidden bg-gray-100">
                            <img
                              src={thumb}
                              alt={doc.title}
                              className="h-full w-full object-cover transform transition-transform duration-300 ease-out group-hover:scale-110"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
                {!mockDocuments?.length && (
                  <div className="col-span-2 md:col-span-4 text-center text-sm text-gray-600">No documents available.</div>
                )}
              </motion.div>
            )}
            <div className="flex justify-center mt-10">
              <button
                className="rounded-full border border-gray-900/30 px-4 py-2 text-sm text-gray-700 hover:border-gray-900 hover:text-gray-900 transition-colors"
                onClick={() => onSkip?.({ skipAll: true })}
              >
                Upload a document
              </button>
            </div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  )
}

