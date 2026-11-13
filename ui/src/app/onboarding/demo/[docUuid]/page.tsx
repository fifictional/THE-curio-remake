'use client';

import { CoreActionsTabs } from "@/components/core/core-actions-tabs";
import { DocumentViewer } from "@/components/core/document-viewer";
import { OnBoardingTopBar } from "@/components/onboarding/onboarding-top-bar";
import { CurioLoading } from "@/components/ui/curio-loading";
import { useDocumentApi, useDocumentUrlApi } from "@/hooks/api/documents";
import { CoreProvider } from "@/providers";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { v4 as uuidv4 } from 'uuid';

export default function DemoPage() {
  const { docUuid } = useParams();
  const userUuid = useMemo(() => uuidv4(), []);

  const { document, isLoading } = useDocumentApi(docUuid as string);
  
  const documentUrl = useDocumentUrlApi(document?.key || '');
  const documentType = document?.type || '';

  if (isLoading) {
    return (<div className="flex flex-row h-screen w-screen">
      <div className="flex flex-col flex-1 flex-shrink-0">
        <OnBoardingTopBar />
        <CurioLoading />
      </div>
    </div>);
  }

  if (!document) {
    return <div>
      An error occurred while loading the document.
    </div>;
  }

  return <div className="flex flex-row h-screen w-screen">
    <div className="flex flex-col flex-1 flex-shrink-0">
      <OnBoardingTopBar />
      
      <div className="flex flex-col items-center justify-center">
        <CoreProvider>
          <DocumentViewer document={document} userUuid={userUuid} documentUrl={documentUrl || ''} documentType={documentType} useFakeChat={true} />
        </CoreProvider>
      </div>
    </div>
    <div className="flex flex-col border-l border-chat-panel-border bg-chat-panel relative min-w-120 max-w-240 w-120 h-full">
      <CoreActionsTabs defaultTab='summary' features={['summary', 'onboarding-chat', 'flashcards', 'quiz']} loadingTabs={[]} />
    </div>
  </div>;
}