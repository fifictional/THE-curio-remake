'use client';

import { useCommonContext } from '@/providers';
import { useEffect, useMemo } from 'react';
import { CoreActionsTabs, Features } from '@/components/core/core-actions-tabs';
import { MockExamChat } from '@/components/mock-exams/mock-exam-chat';

export function MockExamViewer() {
  const { isMobile, openRightPanel, closeRightPanel, setPageTitle, collapseSidebar, uncollapseSidebar } = useCommonContext();

  const features = useMemo<Features[]>(() => {
    return ['exam-chat', 'exam-list'];
  }, []);

  useEffect(() => {
    openRightPanel({ features: ['exam-list'] });
    collapseSidebar();
    setPageTitle('Practice Tests');
    return () => {
      closeRightPanel();
      uncollapseSidebar();
      setPageTitle('');
    }
  }, []);

  if (!isMobile) {
    return (
      <div className="relative h-full flex flex-col overflow-y-auto px-4 pb-4 max-w-4xl mx-auto">
        <MockExamChat />
      </div>
    );
  }

  return (
    <CoreActionsTabs defaultTab='exam-chat' features={features} loadingTabs={[]} />
  );
} 