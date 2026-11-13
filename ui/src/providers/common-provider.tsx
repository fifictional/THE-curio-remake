'use client';

import { createContext, useContext, useState, useMemo, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import { Space } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useProcessingTasksApi } from '@/hooks/api/processing-tasks';
import { useSessionContext } from './session-provider';
import { Features } from '@/components/core/core-actions-tabs';

export type InProgressUpload = {
  files: File[];
  key: string;
  originalKey: string;
  type: string;
  fileName: string;
  spaceName?: string;
  spaceUuid?: string;
  isUploading: boolean;
  documentUuid?: string;
  createdAt?: string;
}

export interface CurrentQuestion {
  questionId: string;
  questionContent: string;
  options: string[];
  correctAnswer: number;
  hint?: string;
  concept?: string;
  subtopic?: string;
  difficulty?: string;
}

interface CommonContextValue {
  inProgressUploads: InProgressUpload[];
  addInProgressUpload: (upload: InProgressUpload) => void;
  removeInProgressUpload: (key: string) => void;
  isUploadModalOpen: boolean;
  isMobile: boolean;

  // Sidebar
  isSidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  collapseSidebar: () => void;
  uncollapseSidebar: () => void;

  // Focus Mode
  focusMode: boolean;
  setFocusMode: (focusMode: boolean) => void;

  // Right panel
  openRightPanel: ({ features, defaultTab }: { features: Features[]; defaultTab?: string }) => void;
  closeRightPanel: () => void;
  isRightPanelOpen: boolean;
  rightPanelFeatures: Features[];
  rightPanelDefaultTab: string | undefined;

  processingTasks: number;
  processingDocumentsUuids: string[];
  pendingDocumentsUuids: string[];
  failedDocumentsUuids: string[];
  isRateLimitModalOpen: boolean;
  setIsRateLimitModalOpen: (isRateLimitModalOpen: boolean) => void;

  pageTitle: string;
  setPageTitle: (pageTitle: string) => void;
  setIsUploadModalOpen: (isUploadModalOpen: boolean) => void;

  // Current Question (for SAT exam question chat)
  currentQuestion: CurrentQuestion | null;
  setCurrentQuestion: (question: CurrentQuestion | null) => void;
  setIsSpaceViewer: Dispatch<SetStateAction<boolean>>
  isSpaceViewer: boolean;
}

const CommonContext = createContext<CommonContextValue | undefined>(undefined);

export function useCommonContext<T = CommonContextValue>(
  selector?: (context: CommonContextValue) => T
) {
  const context = useContext(CommonContext);
  if (!context) {
    throw new Error('useCommonContext must be used within a CommonProvider');
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

export function CommonProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userAttributes } = useSessionContext();
  const [inProgressUploads, setInProgressUploads] = useState<InProgressUpload[]>([]);

  // Memoize the userUuid to prevent constant re-execution of the hook
  const userUuid = useMemo(() => userAttributes?.userUuid || null, [userAttributes?.userUuid]);

  const { processingTasks, processingDocumentsUuids, pendingDocumentsUuids, failedDocumentsUuids } = useProcessingTasksApi({ userUuid });
  const [pageTitle, setPageTitle] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSpaceViewer, setIsSpaceViewer] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion | null>(null);

  const { isMobile } = useIsMobile();

  // Focus Mode
  const [focusMode, setFocusMode] = useState(false);

  // Sidebar
  const [sidebarMode, setSidebarMode] = useState<'static' | 'mobile' | 'collapsed'>(isMobile ? 'mobile' : 'static');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const isSidebarOpen = useMemo(() => {
    if (isMobile) {
      return isMobileSidebarOpen;
    }

    return sidebarMode === 'static' || (sidebarMode === 'collapsed' && !isSidebarCollapsed);
  }, [isMobile, sidebarMode, isMobileSidebarOpen, isSidebarCollapsed]);

  // Right panel
  const [rightPanelFeatures, setRightPanelFeatures] = useState<Features[]>([]);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [rightPanelDefaultTab, setRightPanelDefaultTab] = useState<string | undefined>(undefined);

  const [isRateLimitModalOpen, setIsRateLimitModalOpen] = useState(false);

  const addInProgressUpload = (upload: InProgressUpload) => {
    setInProgressUploads((prev) => [...prev, {
      ...upload,
      isUploading: true,
    }]);
  }
  const removeInProgressUpload = (key: string) => {
    setInProgressUploads(inProgressUploads.filter((upload) => upload.key !== key));
  }

  useEffect(() => {
    if (isMobile && isRightPanelOpen) {
      // close without losing the features
      setIsRightPanelOpen(false);
    } else if (!isMobile && !isRightPanelOpen && rightPanelFeatures.length > 0) {
      // open with the previous features
      setIsRightPanelOpen(true);
    }
  }, [isMobile, isRightPanelOpen]);

  const openRightPanel = useCallback(({ features, defaultTab }: { features: Features[]; defaultTab?: string }) => {
    if (isMobile) return;

    setRightPanelFeatures(features);
    setRightPanelDefaultTab(defaultTab);
    setIsRightPanelOpen(true);
  }, [isMobile,]);

  const closeRightPanel = useCallback(() => {
    setRightPanelFeatures([]);
    setIsRightPanelOpen(false);
  }, []);

  const openSidebar = useCallback(() => {
    if (isMobile) {
      setIsMobileSidebarOpen(true);
    } else if (sidebarMode === 'collapsed') {
      setIsSidebarCollapsed(false);
    }
  }, [isMobile, sidebarMode]);

  const closeSidebar = useCallback(() => {
    if (isMobile) {
      setIsMobileSidebarOpen(false);
    } else if (sidebarMode === 'collapsed') {
      setIsSidebarCollapsed(true);
    }
  }, [isMobile, sidebarMode]);

  const collapseSidebar = useCallback(() => {
    if (isMobile) return;

    setSidebarMode('collapsed');
    setIsSidebarCollapsed(true);
  }, [isMobile]);

  const uncollapseSidebar = useCallback(() => {
    if (isMobile) return;

    setSidebarMode('static');
    setIsSidebarCollapsed(false);
  }, [isMobile]);

  return (
    <CommonContext.Provider value={{
      inProgressUploads,
      addInProgressUpload,
      removeInProgressUpload,
      isUploadModalOpen,
      setIsUploadModalOpen,
      isMobile,

      isSidebarOpen,
      openSidebar,
      closeSidebar,
      collapseSidebar,
      uncollapseSidebar,

      focusMode,
      setFocusMode,

      openRightPanel,
      closeRightPanel,
      isRightPanelOpen,
      rightPanelFeatures,
      rightPanelDefaultTab,

      processingTasks,
      // removed default arrays as they were causing infinite re-renders
      processingDocumentsUuids,
      pendingDocumentsUuids,
      failedDocumentsUuids,
      isRateLimitModalOpen,
      setIsRateLimitModalOpen,

      pageTitle,
      setPageTitle,

      currentQuestion,
      setCurrentQuestion,
      isSpaceViewer,
      setIsSpaceViewer
    }}>
      {children}
    </CommonContext.Provider>
  );
} 