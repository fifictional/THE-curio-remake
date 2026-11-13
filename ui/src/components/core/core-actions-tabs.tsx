import { ExternalLink, FileMinus, FileText, Library, ListCheck, Loader2, MessageCircleMore, TvMinimal } from "lucide-react";
import { TabsContent, TabsList, TabsRoot } from "../ui/tabs";
import { TabsTrigger } from "../ui/tabs";
import { useAnalytics } from "@/providers/analytics-provider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlashcardsIcon } from "../custom-icons/flashcards";
import { QuestionsIcon } from "../custom-icons/questions";
import { QuizIcon } from "../custom-icons/quiz";
import { useCoreContext } from "@/providers/core-provider";
import { usePathname } from "next/navigation";
import { PDFViewerAsTab } from "./as-tabs/pdf-viewer-as-tab";
import { YoutubeViewerAsTab } from "./as-tabs/youtube-viewer-as-tab";
import { DocumentSummaryAsTab } from "./as-tabs/document-summary-as-tab";
import { ChatAsTab } from "./as-tabs/chat-as-tab";
import { SpaceFlashcardsAsTab } from "./as-tabs/space-flashcards-as-tab";
import { SpaceQuizAsTab } from "./as-tabs/space-quiz-as-tab";
import { SpaceSourcesAsTab } from "./as-tabs/space-sources-as-tab";
import { SpaceLibraryAsTab } from "./as-tabs/space-library-as-tab";
import { cn } from "@/lib/utils";
import { MainChatAsTab } from "./as-tabs/main-chat-as-tab";
import { useCommonContext } from "@/providers";
import { emitter } from "@/hooks/use-events";
import { Flashcard, QuizQuestion } from "@/lib/types";
import { useAppSettingsApi } from "@/hooks/api/settings/use-app-settings.api";
import { OnboardingChatAsTab } from "./as-tabs/onboarding-chat-as-tab";
import { ExamChatAsTab } from "./as-tabs/exam-chat-as-tab";
import { MockExamListAsTab } from "./as-tabs/mock-exam-list-as-tab";
import { MockExamQuestionListAsTab } from "./as-tabs/mock-exam-question-list-as-tab";
import { QuestionChatAsTab } from "./as-tabs/question-chat-as-tab";
import { MockExamQuestionAsTab } from "./as-tabs/mock-exam-question-as-tab";
import { SATQuestionChatAsTab } from "./as-tabs/sat-question-chat-as-tab";
import { TakeExamAsTab } from "./as-tabs/take-exam-as-tab";

interface CoreActionsTabsProps {
  features: Features[];
  loadingTabs: Features[];
  className?: string;
  defaultTab?: string;
}

const availableTabs = [
  { value: 'practice-question', label: 'Test', icon: <ListCheck className="w-4 h-4" />, node: <MockExamQuestionAsTab /> },
  { value: 'take-exam', label: 'Exam', icon: <ListCheck className="w-4 h-4" />, node: <TakeExamAsTab /> },
  { value: 'exam-chat', label: 'Chat', icon: <MessageCircleMore className="w-4 h-4" />, node: <ExamChatAsTab /> },
  { value: 'exam-list', label: 'Tests', icon: <ListCheck className="w-4 h-4" />, node: <MockExamListAsTab /> },
  { value: 'question-list', label: 'Questions', icon: <QuestionsIcon className="w-4 h-4" />, node: <MockExamQuestionListAsTab /> },
  { value: 'question-chat', label: 'Chat', icon: <MessageCircleMore className="w-4 h-4" />, node: <QuestionChatAsTab /> },
  { value: 'sat-question-chat', label: 'Chat', icon: <MessageCircleMore className="w-4 h-4" />, node: <SATQuestionChatAsTab /> },
  { value: 'main-chat', label: 'Chat', icon: <MessageCircleMore className="w-4 h-4" />, node: <MainChatAsTab /> },
  { value: 'space-library', label: 'Library', icon: <Library className="w-4 h-4" />, node: <SpaceLibraryAsTab /> },
  { value: 'summary', label: 'Summary', icon: <FileMinus className="w-4 h-4" />, node: <DocumentSummaryAsTab /> },
  { value: 'document', label: 'Document', icon: <FileText className="w-4 h-4" />, node: <PDFViewerAsTab /> },
  { value: 'video', label: 'Video', icon: <TvMinimal className="w-4 h-4" />, node: <YoutubeViewerAsTab /> },
  { value: 'sources', label: 'Sources', icon: <ExternalLink className="w-4 h-4" />, node: <SpaceSourcesAsTab /> },
  { value: 'onboarding-chat', label: 'Chat', icon: <MessageCircleMore className="w-4 h-4" />, node: <OnboardingChatAsTab /> },
  { value: 'chat', label: 'Chat', icon: <MessageCircleMore className="w-4 h-4" />, node: <ChatAsTab /> },
  { value: 'flashcards', label: 'Flashcards', icon: <FlashcardsIcon className="w-4 h-4" />, node: <SpaceFlashcardsAsTab /> },
  { value: 'quiz', label: 'Quiz', icon: <QuizIcon className="w-4 h-4" />, node: <SpaceQuizAsTab /> },
]

export type Features = 'document' | 'video' | 'summary' | 'chat' | 'flashcards' | 'quiz' | 'sources' | 'space-library' | 'main-chat' | 'onboarding-chat' | 'exam-chat' | 'exam-list' | 'question-list' | 'question-chat' | 'sat-question-chat' | 'practice-question' | 'take-exam';

export function CoreActionsTabs({ features, loadingTabs, className, defaultTab }: CoreActionsTabsProps) {
  const { track } = useAnalytics();
  const [value, setValue] = useState<string>(defaultTab || features[0]);
  const tabs = useMemo(() => availableTabs.filter((tab) => features.includes(tab.value as Features)), [features]);
  const { isMobile } = useCommonContext();
  const { appSettings } = useAppSettingsApi();
  const hasUserChangedTab = useRef(false);
  const previousFeatures = useRef(features);

  // Only apply defaultTab on initial mount or when features change
  // Don't reset if user has manually changed the tab (unless features changed, which is a new context)
  useEffect(() => {
    const featuresChanged = previousFeatures.current.join(',') !== features.join(',');
    if (featuresChanged) {
      // Features changed = new context, reset user selection flag
      hasUserChangedTab.current = false;
      setValue(defaultTab || features[0]);
      previousFeatures.current = features;
    } else if (!hasUserChangedTab.current) {
      // Features didn't change, but user hasn't manually selected a tab yet
      // Only update if defaultTab changed and user hasn't interacted
      setValue(defaultTab || features[0]);
    }
  }, [defaultTab, features]);

  const pathname = usePathname();
  const isSpacePage = pathname.includes('/spaces') && !pathname.includes('/chats') && !pathname.includes('/documents');
  const isDocumentPage = pathname.includes('/documents');
  const isChatPage = pathname.includes('/chats');

  const { waitingFor } = useCoreContext();
  const [previousWaitingFor, setPreviousWaitingFor] = useState<typeof waitingFor>(waitingFor);

  // useEffect(() => {
  //   const handler = (flashcard: Flashcard) => {
  //     setValue('flashcards');
  //   };
  //   emitter.on('core:new-flashcard', handler);
  //   return () => {
  //     emitter.off('core:new-flashcard', handler);
  //   };
  // }, []);

  // useEffect(() => {
  //   const handler = (quiz: QuizQuestion) => {
  //     setValue('quiz');
  //   };
  //   emitter.on('core:new-quiz', handler);
  //   return () => {
  //     emitter.off('core:new-quiz', handler);
  //   };
  // }, []);
  
  useEffect(() => {
    if (previousWaitingFor !== waitingFor) {
      if (waitingFor === 'chat' && !isChatPage && features.includes('chat')) {
        setValue('chat');
      }
      setPreviousWaitingFor(waitingFor);
    }
  }, [waitingFor]);

  const handleTabChange = useCallback((tab: string) => {
    hasUserChangedTab.current = true;
    setValue(tab);
    track('right-panel-tab-clicked', {
      tab,
      isSpacePage,
      isDocumentPDF: isDocumentPage,
      isChatPage,
    });
    emitter.emit('core:tab-selected', tab);
  }, [track, isSpacePage, isDocumentPage, isChatPage]);

  if (tabs.length === 1 && isMobile) {
    return tabs[0].node;
  }

  return (
    <TabsRoot defaultValue={defaultTab || features[0]} value={value} className={cn(className, 'flex flex-col h-full')} onValueChange={handleTabChange}>
      <TabsList className="w-full text-xs gap-0 p-0 justify-between border-b border-gray-200">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            data-testid={`tab-${tab.value}`}
            className={cn(
              "flex-1 h-12 rounded-none", 
              "bg-transparent border-b-2 border-transparent text-gray-500",
              "hover:bg-transparent hover:border-gray-500",
              "data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-gray-900 data-[state=active]:text-gray-900",
              isMobile && 'px-2'
            )}
          >
            <div className="relative flex flex-col items-center justify-center gap-0.5 w-full">
              {loadingTabs.includes(tab.value as Features) ? <Loader2 className=" w-5 h-5 animate-spin" /> : tab.icon}
              <span>{tab.label}</span>
            </div>
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className={cn("data-[state=inactive]:hidden h-full pb-4 px-4 overflow-y-scroll flex-1")} forceMount>
          {tab.node}
        </TabsContent>
      ))}
    </TabsRoot>
  );
}
