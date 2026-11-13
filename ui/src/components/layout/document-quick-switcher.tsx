'use client';

import { useListenToDocumentQuickSwitcher } from "@/hooks/use-listen-to-document-quick-switcher";
import { useState } from "react";
import * as Dialog from '@radix-ui/react-dialog';
import { FileText } from "lucide-react";
// import { useDocumentsApi } from "@/hooks/api/use-documents.api";
import { useSessionContext } from "@/providers";
import { useRouter } from "next/navigation";
import { CurioLoading } from "@/components/ui/curio-loading";
import { X } from 'lucide-react';
import { useAnalytics } from "@/providers";
import { StudentDocumentWithSummary } from "@/lib/types";

export const DocumentQuickSwitcher = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { userAttributes } = useSessionContext();
  const { documents, isLoading } = { documents: [] as StudentDocumentWithSummary[], isLoading: false }; //useDocumentsApi({ userUuid: userAttributes?.userUuid || null });
  const { track } = useAnalytics();

  const handleQuickSwitch = () => {
    if (isOpen) {
      track('document-quick-switcher-closed');
    } else {
      track('document-quick-switcher-opened');
    }
    setIsOpen((prev) => !prev);
  };

  useListenToDocumentQuickSwitcher({
    onQuickSwitch: handleQuickSwitch,
  });

  const filteredDocuments = documents.filter(doc => 
    doc.fileName.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (documentUuid: string) => {
    setIsOpen(false);
    track('document-quick-switched', {
      documentUuid,
    });
    router.prefetch(`/documents/${documentUuid}`);
    router.push(`/documents/${documentUuid}`);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Portal>
        <Dialog.Title className="sr-only">Document Quick Switcher</Dialog.Title>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <Dialog.Description id="document-quick-switcher-description" className="sr-only">Document Quick Switcher</Dialog.Description>
          <div className="flex flex-col">
            <div className="flex items-center border-b px-3">
              <input
                className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Dialog.Close className="rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-gray-100">
                <X className="h-4 w-4 text-gray-800" />
                <span className="sr-only">Close</span>
              </Dialog.Close>
            </div>
            <div className="overflow-y-auto max-h-[300px]">
              {isLoading ? (
                <div className="py-6 text-center">
                  <CurioLoading />
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-800">
                  No documents found.
                </div>
              ) : (
                <div className="px-1 py-2">
                  <div className="text-xs font-semibold text-gray-800 px-2 py-1.5">
                    Documents
                  </div>
                  {filteredDocuments.map((doc) => (
                    <button
                      key={doc.documentUuid}
                      onClick={() => handleSelect(doc.documentUuid)}
                      className="relative flex w-full cursor-pointer text-gray-800 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      <span>{doc.fileName}</span>
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
};