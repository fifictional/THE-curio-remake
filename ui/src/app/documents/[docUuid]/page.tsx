'use client';

import { DocumentViewer } from '@/components/core/document-viewer';
import { CurioLoading } from '@/components/ui/curio-loading';
import { useDocumentUrlApi, useDocumentApi } from '@/hooks/api/documents';
import { useCommonContext, useCoreContext, useSessionContext, useAnalytics } from '@/providers';
import { useEffect } from 'react';
import { useHasResourceAccess } from '@/hooks/use-has-resource-access';
import { AccessDenied } from '@/design-system/access-denied';
import { useParams } from 'next/navigation';

export default function SpacePage() {
  const params = useParams();
  const docUuid = params.docUuid as string;
  const { document: contextDocument } = useCoreContext();
  const { document, isLoading: isDocumentLoading } = useDocumentApi(docUuid);
  const documentToCheck = document || contextDocument;
  const { hasAccess, isLoading: isAccessLoading } = useHasResourceAccess(documentToCheck);
  const { userAttributes } = useSessionContext();
  const { track } = useAnalytics();
  const documentType = documentToCheck?.type || '';
  // For images we can render the originally uploaded file immediately while
  // the backend PDF-conversion pipeline (which populates `key`) is still
  // running or if it has failed outright. For other types we still prefer the
  // processed `key`.
  const isImageDoc = documentType.toLowerCase().includes('image');
  const documentUrl = useDocumentUrlApi(
    documentToCheck?.key || '',
    isImageDoc ? documentToCheck?.originalKey || '' : undefined,
  );
  
  const { openRightPanel, closeRightPanel, collapseSidebar, uncollapseSidebar } = useCommonContext();
  useEffect(() => {
    if (hasAccess && documentToCheck) {
      // Track if user opens another user's document
      if (documentToCheck.userUuid && userAttributes?.userUuid && documentToCheck.userUuid !== userAttributes.userUuid) {
        track('folder-user-document-opened', {
          documentUuid: documentToCheck.documentUuid,
          documentOwnerUuid: documentToCheck.userUuid,
          spaceUuid: documentToCheck.spaceUuid || null,
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
  }, [documentToCheck, hasAccess, openRightPanel, collapseSidebar, closeRightPanel, uncollapseSidebar, userAttributes?.userUuid, track]);

  if (isDocumentLoading || isAccessLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <CurioLoading />
      </div>
    );
  }

  if (!documentToCheck || !hasAccess) {
    return <AccessDenied />;
  }

  return <DocumentViewer document={documentToCheck} userUuid={userAttributes?.userUuid || ''} documentUrl={documentUrl || ''} documentType={documentType} />
}