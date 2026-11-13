'use client';

import { useSpaceContext } from '@/providers/space-provider';
import { useCommonContext, useSessionContext } from '@/providers';
import { SpaceLibrary } from './space-library';
import { CoreActionsTabs } from './core-actions-tabs';
import { useLoadingTabs } from '@/hooks/use-loading-tabs';

export function SpaceViewer() {
  const { spaceUuid } = useSpaceContext();
  const { isMobile } = useCommonContext();
  const { userAttributes } = useSessionContext();

  const { loadingTabs } = useLoadingTabs({ userUuid: userAttributes?.userUuid || null, documentUuid: null, isSpaceLibrary: true });
  if (!isMobile) {
    return <SpaceLibrary spaceUuid={spaceUuid || undefined} />
  }

  return (
    <main className="flex flex-col items-center pt-3 w-full h-full">
      <div className="w-full max-w-6xl h-full">
        <CoreActionsTabs features={['space-library', 'flashcards', 'quiz']} loadingTabs={loadingTabs} />
      </div>
    </main>
  );
} 