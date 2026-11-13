'use client';

import { createContext, useCallback, useContext, useState, useMemo, Dispatch, SetStateAction } from 'react';
import { StudentDocument, StudentDocumentVisionOutput, StudentDocumentSummary } from '@/lib/types';
import { useDocumentSummaryApi, useDocumentVisionOutputApi } from '@/hooks/api/documents';
import { useDocumentApi } from '@/hooks/api/documents';
import { useParams } from 'next/navigation';

interface CoreContextValue {
  documentUuid: string | null;
  document: StudentDocument | null;

  documentSummary: StudentDocumentSummary | null;
  documentVisionOutputs: StudentDocumentVisionOutput[] | null;
  isDocumentSummaryLoading: boolean;
  isDocumentSummaryContentLoading: boolean;

  waitingForResponse: boolean;
  waitingFor: 'chat' | 'flashcard' | 'quiz' | null;
  setWaitingForResponse: (waitingFor: 'chat' | 'flashcard' | 'quiz' | null) => void;
  setSpaceDocumentProcessing: Dispatch<SetStateAction<boolean>>;
  spaceDocumentProcessing: boolean;
  spaceDocumentLoading: boolean;
  setSpaceDocumentLoading: Dispatch<SetStateAction<boolean>>;
}

const CoreContext = createContext<CoreContextValue | undefined>(undefined);

export function useCoreContext<T = CoreContextValue>(
  selector?: (context: CoreContextValue) => T
) {
  const context = useContext(CoreContext);
  if (!context) {
    throw new Error('useCoreContext must be used within a CoreProvider');
  }

  // If no selector provided, return full context (backward compatibility)
  if (!selector) {
    return context as T;
  }

  // Use selector and memoize result to prevent unnecessary re-renders
  const selectedValue = useMemo(() => {
    return selector(context);
  }, [context, selector]);

  return selectedValue;
}

export function CoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { docUuid } = useParams();

  const { documentSummary, isLoading: isDocumentSummaryLoading } = useDocumentSummaryApi({ documentUuid: docUuid as string });
  const { documentVisionOutputs, isLoading: isDocumentSummaryContentLoading } = useDocumentVisionOutputApi({ documentUuid: docUuid as string });
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const [spaceDocumentProcessing, setSpaceDocumentProcessing] = useState(false);
  const [spaceDocumentLoading, setSpaceDocumentLoading] = useState(false);
  const [waitingFor, setWaitingFor] = useState<'chat' | 'flashcard' | 'quiz' | null>(null);

  const { document } = useDocumentApi(docUuid as string);

  const wrappedSetWaitingForResponse = useCallback((waitingFor: 'chat' | 'flashcard' | 'quiz' | null) => {
    setWaitingForResponse(waitingFor === null ? false : true);
    setWaitingFor(waitingFor);
  }, []);

  return (
    <CoreContext.Provider value={{
      documentUuid: docUuid as string,
      document: document || null,

      documentSummary,
      documentVisionOutputs,
      isDocumentSummaryLoading,
      isDocumentSummaryContentLoading,

      waitingForResponse,
      waitingFor,
      setWaitingForResponse: wrappedSetWaitingForResponse,
      spaceDocumentProcessing,
      spaceDocumentLoading,
      setSpaceDocumentProcessing,
      setSpaceDocumentLoading
    }}>
      {children}
    </CoreContext.Provider>
  );
} 