'use client';

import { SpaceViewer } from '@/components/core/space-viewer';
import { useCommonContext } from '@/providers';
import { useEffect } from 'react';

export default function SpacePage() {
  const { openRightPanel, closeRightPanel, collapseSidebar, uncollapseSidebar, setIsSpaceViewer } = useCommonContext();
  
  useEffect(() => {
    openRightPanel({ features: ['flashcards', 'quiz'] });
    collapseSidebar();
    setIsSpaceViewer(true);
    return () => {
      closeRightPanel();
      uncollapseSidebar();
      setIsSpaceViewer(false);
    }
  }, [openRightPanel, collapseSidebar, setIsSpaceViewer, closeRightPanel, uncollapseSidebar]);

  return <SpaceViewer />
} 