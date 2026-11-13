'use client';

import { forwardRef } from 'react';
import { ResizeBar } from './resize-bar';
import { CoreActionsTabs, Features } from '../core/core-actions-tabs';
import { usePathname } from 'next/navigation';
import { useLoadingTabs } from '@/hooks/use-loading-tabs';
import { useCommonContext, useCoreContext, useSessionContext } from '@/providers';
import { cn } from '@/lib/utils';

interface RightPanelProps {
  onDragStart: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export const RightPanel = forwardRef<HTMLDivElement, RightPanelProps>(({ onDragStart }, ref) => {
  // const pathname = usePathname();
  const { userAttributes } = useSessionContext();
  const { documentUuid } = useCoreContext();
  // const isSpacePage = pathname.includes('/spaces') && !pathname.includes('/chats') && !pathname.includes('/documents');
  // const isChatPage = pathname.includes('/chats');

  const { rightPanelFeatures, rightPanelDefaultTab, isSpaceViewer } = useCommonContext();
  // const features = isSpacePage ? ['flashcards', 'quiz'] : isChatPage ? ['sources', 'flashcards', 'quiz'] : ['summary', 'chat', 'flashcards', 'quiz'];

  const { loadingTabs } = useLoadingTabs({ userUuid: userAttributes?.userUuid || null, documentUuid, isSpaceLibrary: isSpaceViewer });

  // Determine default tab: use rightPanelDefaultTab if provided, otherwise fall back to 'chat' or first feature
  const defaultTab = rightPanelDefaultTab || (rightPanelFeatures.includes('chat') ? 'chat' : rightPanelFeatures[0]);

  return (
    <div ref={ref} className={cn(
      "min-w-120 max-w-240 w-120",
      "border-l border-chat-panel-border",
      "bg-chat-panel relative",
      "h-full")
    }>
      <ResizeBar onDragStart={onDragStart} />
      <CoreActionsTabs defaultTab={defaultTab} features={rightPanelFeatures as Features[]} loadingTabs={loadingTabs} />
    </div>
  );
});
