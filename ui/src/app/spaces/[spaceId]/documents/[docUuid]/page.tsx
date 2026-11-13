'use client';

import { DocumentViewer } from '@/components/core/document-viewer';
import { CurioLoading } from '@/components/ui/curio-loading';
import { useDocumentUrlApi } from '@/hooks/api/documents';
import { useCommonContext, useCoreContext, useSessionContext, useAnalytics } from '@/providers';
import { useEffect } from 'react';

export default function SpaceDocumentPage() {
  const { document } = useCoreContext();
  const { userAttributes } = useSessionContext();
  const { track } = useAnalytics();
  const documentUrl = useDocumentUrlApi(document?.key || '');
  const documentType = document?.type || '';
  
  const { openRightPanel, closeRightPanel, collapseSidebar, uncollapseSidebar } = useCommonContext();
  useEffect(() => {
    if (document) {
      // Track if user opens another user's document
      if (document.userUuid && userAttributes?.userUuid && document.userUuid !== userAttributes.userUuid) {
        track('folder-user-document-opened', {
          documentUuid: document.documentUuid,
          documentOwnerUuid: document.userUuid,
          spaceUuid: document.spaceUuid || null,
        });
      }
      
      // Always default to summary tab for documents
      openRightPanel({ features: ['summary', 'chat', 'flashcards', 'quiz'], defaultTab: 'summary' });
      collapseSidebar();
      return () => {
        closeRightPanel();
        uncollapseSidebar();
      }
    }
  }, [document, userAttributes?.userUuid, track, openRightPanel, collapseSidebar, closeRightPanel, uncollapseSidebar]);

  if (!document) {
    return <div>
      <CurioLoading />
    </div>;
  }

  return <DocumentViewer document={document} userUuid={userAttributes?.userUuid || ''} documentUrl={documentUrl || ''} documentType={documentType} />
} 