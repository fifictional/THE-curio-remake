'use client';

import { useSpaceApi } from '@/hooks/api/spaces';
import { useParams } from 'next/navigation';
import { createContext, useContext, useMemo } from 'react';
import { useDocumentsBySpaceApi } from '@/hooks/api/documents/use-documents-by-space.api';
import { Reference } from '@/components/core/general-chat';
import { useHasSpaceAccess, type SpaceAccessLevel } from '@/hooks/use-has-space-access';

// Re-export for convenience
export type { SpaceAccessLevel };

interface SpaceContextValue {
  spaceUuid: string | null;
  spaceName: string | null;
  references: Reference[];
  accessLevel: SpaceAccessLevel;
  hasAccess: boolean;
  isOwner: boolean;
  canWrite: boolean;
  canRead: boolean;
  isAccessLoading: boolean;
}

const SpaceContext = createContext<SpaceContextValue | undefined>(undefined);

export function useSpaceContext() {
  const context = useContext(SpaceContext);
  if (!context) {
    throw new Error('useSpaceContext must be used within a SpaceProvider');
  }
  return context;
}

// Safe version that returns null if not in a space context
export function useSpaceContextSafe() {
  const context = useContext(SpaceContext);
  return context || null;
}
  
export function SpaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { spaceId } = useParams();
  const { space } = useSpaceApi(spaceId as string);
  const spaceUuid = spaceId as string | null;

  // Check access to the space
  const {
    accessLevel,
    hasAccess,
    isOwner,
    canWrite,
    canRead,
    isLoading: isAccessLoading,
  } = useHasSpaceAccess(spaceUuid);

  // Get documents with embeddings for references (only if we have a spaceUuid)
  const { documents: spaceDocuments } = useDocumentsBySpaceApi({
    spaceUuid: spaceUuid || null,
    options: {
      perPage: 500,
      subscriptions: 'all',
      key: 'space-references',
    },
  });

  // Convert documents to references format
  // Return empty array if no spaceUuid
  const references = useMemo<Reference[]>(() => {
    if (!spaceUuid) {
      return [];
    }
    const documentsWithEmbeddings = spaceDocuments.filter(doc => doc.hasRagEmbeddings === true);
    if (documentsWithEmbeddings.length === 0) {
      return [];
    }
    return documentsWithEmbeddings.map(doc => ({
      id: doc.documentUuid,
      title: doc.fileName,
      type: 'document' as const,
      hasEmbeddings: doc.hasRagEmbeddings === true,
    }));
  }, [spaceDocuments, spaceUuid]);

  return (
    <SpaceContext.Provider value={{
      spaceUuid: spaceUuid || null,
      spaceName: space?.name || null,
      references,
      accessLevel,
      hasAccess,
      isOwner,
      canWrite,
      canRead,
      isAccessLoading,
    }}>
      {children}
    </SpaceContext.Provider>
  );
} 