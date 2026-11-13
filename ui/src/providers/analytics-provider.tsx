'use client';

import { createContext, useContext, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { analytics } from '@/lib/analytics';
import { emitter } from '@/hooks/use-events';

interface AnalyticsContextType {
  track: typeof analytics.track;
  identify: typeof analytics.identify;
  people: typeof analytics.people;
  reset: typeof analytics.reset;
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const pathname = usePathname();

  // Subscribe to session init
  useEffect(() => {
    const handler = (session: string) => {
      const { userId, email } = JSON.parse(session);
      analytics.identify(userId);
      analytics.people.set({
        email,
        $last_login: new Date(),
        $last_seen: new Date(),
      });
    };

    emitter.on('session:init', handler);
    return () => emitter.off('session:init', handler);
  }, []);

  // Track page views
  
  useEffect(() => {
    const isHomePage = pathname === '/';
    const trackObject: Record<string, any> = {
      pathname,
      url: window.location.href,
    }
    if (isHomePage) {
      trackObject.isSigninPage = !localStorage.getItem('user_id');
    }

    analytics.track('Page View', trackObject);
  }, [pathname]);

  const value: AnalyticsContextType = {
    track: analytics.track.bind(analytics),
    identify: analytics.identify.bind(analytics),
    people: analytics.people,
    reset: analytics.reset.bind(analytics),
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
} 