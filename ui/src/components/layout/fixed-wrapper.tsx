'use client';

import { TopBar } from "./top-bar";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";
import { RightPanel } from "./right-panel";
import { redirect, usePathname } from "next/navigation";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { useCommonContext, useSessionContext, useSpaceContext } from "@/providers";
import { DocumentQuickSwitcher } from "./document-quick-switcher";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { RateLimitModal } from "@/components/modals/rate-limit-modals";
import { OnboardingModal } from "../onboarding/onboarding-modal";
import { PassiveHomeUpload } from "../home/passive-home-upload";
import { Loader2 } from "lucide-react";
import { useFlashSales } from "@/hooks/use-flash-sales";
import { MaintenanceMessageBanner } from "./maintenance-message-banner";
import { MemoryBackfillBanner } from "./memory-backfill-banner";
import { useAppSettingsApi } from "@/hooks/api/settings/use-app-settings.api";
import { useAnalytics } from "@/providers/analytics-provider";
import { SurveyBanner } from "./survey-banner";
import { FlashSaleTextBanner } from "../flash-sales/flash-sale-text-banner";

interface FixedWrapperProps {
  children: React.ReactNode;
}

const guestRoutes = ['/companion/upload', '/signin', '/signup', '/onboarding', '/satus-onboarding', '/partner', '/gifting', '/one-dollar'];
const guestOnlyRoutes = ['/satus-onboarding', '/partner', '/gifting', '/one-dollar'];
const signedInRoutesWithNoSidebar = ['/welcome'];

const MIN_RIGHT_PANEL_WIDTH = 480;
const MAX_RIGHT_PANEL_WIDTH = 960;

export function FixedWrapper({ children }: FixedWrapperProps) {
  const { route, user } = useAuthenticator(context => [context.route, context.user]);
  const { spaceUuid } = useSpaceContext();
  const { userProfile, isUserSubscribed, hasFeatureFlag } = useSessionContext();
  const {
    isMobile,

    isSidebarOpen,
    closeSidebar,

    isRateLimitModalOpen,
    setIsRateLimitModalOpen,

    isRightPanelOpen,
  } = useCommonContext();

  const { track } = useAnalytics();
  
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const topBarRef = useRef<HTMLDivElement>(null);
  const centerContentRef = useRef<HTMLDivElement>(null);

  const isDraggingRightPanel = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const onDragStart = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    isDraggingRightPanel.current = true;
    startX.current = event.clientX;
    startWidth.current = rightPanelRef.current?.clientWidth || MIN_RIGHT_PANEL_WIDTH;
    // Temporarily disable text selection globally during resize drag
    document.body.style.userSelect = 'none';
    // Prevent interactive elements (e.g., videos/iframes) from stealing mouse events during drag
    rightPanelRef.current?.style.setProperty('pointer-events', 'none');
    centerContentRef.current?.style.setProperty('pointer-events', 'none');
    // Track drag at window level to avoid losing events when hovering over embeds
    window.addEventListener('mousemove', handleWindowMouseMove, true);
    window.addEventListener('mouseup', handleWindowMouseUp, true);
  }, []);
  const onDragMove = useCallback((event: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    if (isDraggingRightPanel.current) {
      const diff = event.clientX - startX.current;
      const newWidth = startWidth.current - diff;
      if (newWidth >= MIN_RIGHT_PANEL_WIDTH && newWidth <= MAX_RIGHT_PANEL_WIDTH) {
        rightPanelRef.current?.style.setProperty('width', `${newWidth}px`);
      }
    }
  }, []);
  const onDragEnd = useCallback((event: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    isDraggingRightPanel.current = false;
    // Re-enable text selection after drag ends
    document.body.style.userSelect = '';
    // Restore pointer events after drag ends
    rightPanelRef.current?.style.removeProperty('pointer-events');
    centerContentRef.current?.style.removeProperty('pointer-events');
    // Remove global listeners
    window.removeEventListener('mousemove', handleWindowMouseMove, true);
    window.removeEventListener('mouseup', handleWindowMouseUp, true);
  }, []);

  const handleWindowMouseMove = useCallback((event: MouseEvent) => {
    onDragMove(event);
  }, [onDragMove]);

  const handleWindowMouseUp = useCallback((event: MouseEvent) => {
    onDragEnd(event);
  }, [onDragEnd]);

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove, true);
      window.removeEventListener('mouseup', handleWindowMouseUp, true);
      document.body.style.userSelect = '';
      rightPanelRef.current?.style.removeProperty('pointer-events');
      centerContentRef.current?.style.removeProperty('pointer-events');
    };
  }, [handleWindowMouseMove, handleWindowMouseUp]);

  const isUserAuthenticated = useMemo(() => {
    return !!user;
  }, [route]);

  const path = usePathname();
  const { getFlashSaleForPage } = useFlashSales();
  const flashSale = getFlashSaleForPage();
  const { appSettings } = useAppSettingsApi();
  const maintenanceMessage = appSettings?.maintenanceMessage;
  const showSurveyBanner = hasFeatureFlag('show_survey_banner');
  
  const openSurvey = useCallback(() => {
    track('survey_banner_clicked', {
      isMobile: isMobile,
    });
    // open survey in a new tab
    // will this work on mobile?
    // will this be catched by adblockers?
    window.open('https://form.typeform.com/to/M6cFuQrB', '_blank');
  }, [isMobile]);

  // Determine if sidebar and topbar should be shown based on routing
  // Guest routes (signin, signup, etc.) should not show sidebar/topbar
  const showSidebarAndTopbar = useMemo(() => {
    return isUserAuthenticated && !signedInRoutesWithNoSidebar.some(route => path.startsWith(route));
  }, [isUserAuthenticated, path]);

  // Show maintenance message only for authenticated users, excluding signin/signup routes
  const showMaintenanceMessage = isUserAuthenticated && 
    !guestRoutes.some(route => path.startsWith(route)) && 
    !!maintenanceMessage;

  if (route === 'idle') {
    return <CommonLoading />
  }

  if (!isUserAuthenticated && guestRoutes.some(route => path.startsWith(route))) {
    return <>
      {children}
    </>
  }

  if (!isUserAuthenticated && !guestRoutes.some(route => path.startsWith(route))) {
    // Redirect unauthenticated users to sign in, preserving only the path.
    // Using the full URL (path + search) here caused an exponential
    // `?redirect=...?redirect=...` loop, because the search string already
    // contained the previous redirect.
    const redirectUrl = encodeURIComponent(path);
    
    // Check if utm_source=fb to redirect to signup instead of signin
    const searchParams = new URLSearchParams(window.location.search);
    const utmSource = searchParams.get('utm_source');
    
    if (utmSource === 'fb') {
      redirect(`/signup?redirect=${redirectUrl}`);
    } else {
      redirect(`/signin?redirect=${redirectUrl}`);
    }
    return <>null</>;
  }

  if (isUserAuthenticated && [...guestRoutes].some(route => path.startsWith(route))) {
    // redirect authenticated user to home or redirect URL (from signin/signup pages)
    const searchParams = new URLSearchParams(window.location.search);
    let redirectUrl: string | null = searchParams.get('redirect');
    
    // Prioritize localStorage (from onboarding flow) over URL query params
    // This ensures we use the correct redirect from onboarding, not OAuth callback URLs
    const storedRedirect = localStorage.getItem('post_auth_redirect');
    if (storedRedirect) {
      redirectUrl = storedRedirect;
      localStorage.removeItem('post_auth_redirect');
    }
    
    // Filter out invalid redirect URLs (auth pages, login page)
    const invalidRedirects = ['/signin', '/signup', '/login', '/onboarding', '/partner', '/gifting'];
    if (redirectUrl) {
      const urlToCheck = redirectUrl as string;
      const isInvalid = invalidRedirects.some(invalid => 
        urlToCheck === invalid || urlToCheck.startsWith(`${invalid}?`)
      );
      if (isInvalid) {
        redirectUrl = null;
      }
    }
    
    if (!!userProfile && !userProfile.onboardingCompleted && !userProfile.onboardingSkipped) {
      // Pass redirect URL to welcome page so it can redirect after onboarding
      const welcomeUrl = redirectUrl && redirectUrl !== '/signin' && redirectUrl !== '/signup' && redirectUrl !== '/login'
        ? `/welcome?redirect=${encodeURIComponent(redirectUrl)}`
        : '/welcome';
      redirect(welcomeUrl);
    } else if (!!userProfile && (userProfile.onboardingCompleted || userProfile.onboardingSkipped)) {
      // Redirect directly to target or home
      if (!guestOnlyRoutes.some(route => path?.startsWith(route))) {
        redirect(redirectUrl ? decodeURIComponent(redirectUrl) : '/');
      }
    }
    // return <CommonLoading />
  }

  return (
    <div id="screen-container-wrapper" className="flex flex-col h-dvh w-full">
      {showMaintenanceMessage && (
        <div className="w-full shrink-0">
          <MaintenanceMessageBanner message={maintenanceMessage} />
        </div>
      )}

      <div id="screen-container" className="flex flex-1 flex-row min-h-0 w-full">
        {/* Sidebar - only show if showSidebarAndTopbar is true */}
        {showSidebarAndTopbar && (
          <>
            {!isMobile && (
              <div id="sidebar-container" className="flex bg-focus">
                <Sidebar />
              </div>
            )}

            {isMobile && (
              <>
                {isSidebarOpen && <div className={cn("absolute top-0 left-0 right-0 bottom-0 z-30 bg-black/50 transition-all duration-300")} onClick={() => closeSidebar()}></div>}
                <div id="mobile-sidebar-container" className={cn("absolute top-0 left-0 bottom-0 z-30 flex -translate-x-120 transition-all duration-300 bg-focus", isSidebarOpen && 'translate-x-0')}>
                  <Sidebar />
                </div>
              </>
            )}
          </>
        )}

        <div id="main-content-container" className="flex flex-col flex-1 min-h-0 w-full min-w-0">
          {/* TopBar - only show if showSidebarAndTopbar is true */}
          {showSidebarAndTopbar && (
            <div id="topbar-container" className="shrink-0 w-full">
              <TopBar />
            </div>
          )}

          <div id="content-area-container" className="flex flex-1 flex-col w-full relative min-h-0">
            {/* Archway - only show if showSidebarAndTopbar is true */}
            {showSidebarAndTopbar && !isMobile && <Archway />}

            <MemoryBackfillBanner />

            {/* Flash sale banner */}
            {flashSale && (
              <FlashSaleTextBanner flashSale={flashSale} />
            )}

            {/* Survey banner */}
            {isUserSubscribed && showSurveyBanner && (
              <SurveyBanner isMobile={isMobile} onSurveyClick={openSurvey} />
            )}

            {/* Scrollable main content */}
            <main 
              id="main-content-main" 
              className="bg-white transition-all duration-300 w-full flex-1 flex flex-row text-gray-700 min-h-0"
              ref={centerContentRef}
            >
              <div className="relative mx-auto overflow-y-scroll w-full h-full">
                {children}
              </div>

              {/* Right Sidebar - enable pointer events */}
              {isRightPanelOpen && showSidebarAndTopbar && (
                <div id="right-panel-container" className="h-full ml-auto">
                  <RightPanel ref={rightPanelRef} onDragStart={onDragStart} />
                </div>
              )}
            </main>
          </div>
        </div>
      
        {/* <OnboardingModal /> */}
        {showSidebarAndTopbar && <DocumentQuickSwitcher />}
        <RateLimitModal open={isRateLimitModalOpen} onOpenChange={setIsRateLimitModalOpen} />

        {showSidebarAndTopbar && <PassiveHomeUpload defaultSpaceUuid={spaceUuid || undefined} />}
      </div>
    </div>
  );
} 

const CommonLoading = () => {
  return (
    <div className="flex w-full min-h-full">
      <div className="flex flex-col items-center justify-center flex-1 w-1/2 min-h-full">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    </div>
  );
}

const Archway = () => {
  return (
    <div 
      className={cn("absolute left-0 top-0 w-8 h-8 transition-all duration-300 pointer-events-none z-[1200]")}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full text-gray-200">
      <path d="M100,0 H0 V100 A100,100 0 0,1 100,0 Z" fill="var(--color-focus)" stroke="none" />
      <path d="M0,100 A100,100 0 0,1 100,0" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    </div>
  )
};
