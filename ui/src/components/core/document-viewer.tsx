'use client';

import { PDFViewer } from './pdf-viewer';
import { YoutubeViewer } from './youtube-viewer';
import { useCommonContext, useSessionContext } from '@/providers';
import { CoreActionsTabs, Features } from './core-actions-tabs';
import { useLoadingTabs } from '@/hooks/use-loading-tabs';
import { StudentDocument } from '@/lib/types/document';
import { LoadingSpinnerWithType } from '@/components/ui/loading-spinner-with-type';

interface DocumentViewerProps {
  document: StudentDocument;
  userUuid: string;
  documentUrl: string;
  documentType: string;
  useFakeChat?: boolean;
}

export function DocumentViewer({ document, userUuid, documentUrl, documentType, useFakeChat }: DocumentViewerProps) {
  const { isMobile } = useCommonContext();
  const { loadingTabs } = useLoadingTabs({ userUuid: userUuid || null, documentUuid: document?.documentUuid || null });
  const lower = (documentType || '').toLowerCase();
  const type = lower.includes('youtube') ? 'video' : lower.includes('image') ? 'image' : 'pdf';

  if (!documentUrl) { 
    return (
        <LoadingSpinnerWithType type={type as 'video' | 'image' | 'pdf'} className='h-full'/>
    );
  }

  if(!isMobile) {
    return (
      <div className="flex flex-col h-full">
        {documentType.toLowerCase().includes('youtube') ? (
          <YoutubeViewer youtubeVideoUuid={document?.youtubeVideoUuid || ''} />
        ) : type === 'image' ? (
          <div className="flex items-center justify-center h-full w-full overflow-auto bg-muted">
            <img
              src={documentUrl}
              alt={document?.fileName || 'Uploaded image'}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : (
          <PDFViewer url={documentUrl} type={type} />
        )}
      </div>
    );
  }

  return (
    <main className="flex flex-col items-center pt-3 w-full h-full">
      <div className="w-full max-w-6xl h-full">
        <CoreActionsTabs defaultTab='chat' features={['summary', documentType.toLowerCase().includes('youtube') ? 'video' : 'document', useFakeChat ? 'onboarding-chat' : 'chat', 'flashcards', 'quiz']} loadingTabs={loadingTabs} />
      </div>
    </main>
  );
} 
