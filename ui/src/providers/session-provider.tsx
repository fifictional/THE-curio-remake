'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { emitter } from '@/hooks/use-events';
import { setUserIdCookie } from '@/lib/utils';
import { fetchUserAttributes } from '@/lib/local-auth';
import { useAuthenticator } from '@/lib/local-auth-react';
import { useUserRequestsApi } from '@/hooks/api/user-requests';
import { fetchAuthSession } from '@/lib/local-auth';
import { startOfDay, endOfDay } from 'date-fns';
import { useDocumentsByUserApi } from '@/hooks/api/documents';
import { useUserProfileApi } from '@/hooks/api/user/use-user-profile.api';
import { UserProfile } from '@/lib/types';
import { useAppSettingsApi } from '@/hooks/api/settings/use-app-settings.api';
import { useSubscriptionsApi } from '@/hooks/api/subscriptions';
import { usePathname } from 'next/navigation';

type UserAttributes = {
  userUuid: string;
  givenName: string;
  familyName: string;
  email: string;
}

interface SessionContextValue {
  userAttributes: UserAttributes | null;
  userProfile: UserProfile | null;
  groups: string[];
  isLoading: boolean;
  isAdmin: boolean;
  pairCompanion: (userUuid: string) => void;
  hasReachedDailyLimitForFreePremiumMessages: boolean;
  hasReachedDailyLimit: boolean;
  hasReachedDailyLimitForAnalysis: boolean;
  hasReachedMinuteLimit: boolean;
  userRequestsToday: number;
  userRequestsLastMinute: number;
  tokenCountToday: number;
  tokenCountLastMinute: number;
  documentCountToday: number;
  documentTokenCountToday: number;
  nextRequestAt: Date | null;
  nextRequestAtForAnalysis: Date | null;
  hasReachedDailyLimitForWebSearch: boolean;
  hasFeatureFlag: (flagName: string) => boolean;
  isUserSubscribed: boolean;
  getUserSubscriptionLevel: () => 'none' | 'super' | 'ultra';
  totalDocuments: number
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function useSessionContext<T = SessionContextValue>(
  selector?: (context: SessionContextValue) => T
) {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionContext must be used within a SessionProvider');
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

const MAX_FREE_PREMIUM_MESSAGES = process.env.NEXT_PUBLIC_MAX_FREE_PREMIUM_MESSAGES ? Number(process.env.NEXT_PUBLIC_MAX_FREE_PREMIUM_MESSAGES) : 5;

export function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userAttributes, setUserAttributes] = useState<UserAttributes | null>(null);
  const { userRequests: rawUserRequests } = useUserRequestsApi({
    userUuid: userAttributes?.userUuid || null,
    startDate: startOfDay(new Date()).toISOString(),
    endDate: endOfDay(new Date()).toISOString(),
  });
  // The bridge can yield sparse pages while the session is resolving; every
  // consumer below does `request.documentUuid`, so drop nulls once here.
  const userRequests = useMemo(
    () => (rawUserRequests ?? []).filter(Boolean),
    [rawUserRequests],
  );
  const { documents } = useDocumentsByUserApi({ userUuid: userAttributes?.userUuid || null, options: { perPage: 500, subscriptions: 'all', key: 'session-provider' } });
  const { userProfile } = useUserProfileApi(userAttributes?.userUuid || null);
  const { user } = useAuthenticator();
  const [groups, setGroups] = useState<string[]>([]);
  const [resetMinuteLimit, setResetMinuteLimit] = useState(false);
  const { appSettings } = useAppSettingsApi();

  const { subscriptions, isLoading: isLoadingSubscriptions } = useSubscriptionsApi(userAttributes?.userUuid || null);
  const pathname = usePathname();
  /** On companion upload, `pairCompanion` sets `userId` to the desktop user's UUID; do not overwrite with the phone browser's Cognito id. */
  const skipUserIdCookieSync = pathname?.includes('/companion/upload') ?? false;

  const hasReachedDailyLimitForFreePremiumMessages = useMemo(() => {
    // The bridge can hand back sparse pages while a session is resolving; a null
    // entry used to throw here and take the whole app down.
    return userRequests.filter((request) => request?.documentUuid === null).length >= MAX_FREE_PREMIUM_MESSAGES;
  }, [userRequests]);
  
  useEffect(() => {
    fetchAuthSession().then(({ tokens}) => {
      setGroups(tokens?.accessToken?.payload?.['cognito:groups'] as string[] || []);
    });
  }, []);

  const userCoreRequests = useMemo(() => {
    return userRequests.filter((request) => !request.documentUuid);
  }, [userRequests]);
  const userAnalysisRequests = useMemo(() => {
    return userRequests.filter((request) => !!request.documentUuid);
  }, [userRequests]);

  const isLastRequestRateLimitError = useMemo(() => {
    return userCoreRequests.length > 0 && userCoreRequests[userCoreRequests.length - 1]?.requestStatus === 429;
  }, [userCoreRequests]);

  useEffect(() => {
    const getUserAttributes = async () => {
      if (user) {
        const userAttributes = await fetchUserAttributes();
        setUserAttributes({
          userUuid: user.userId || '',
          givenName: userAttributes.given_name || '',
          familyName: userAttributes.family_name || '',
          email: userAttributes.email || '',
        });

        emitter.emit('session:init', JSON.stringify({
          userId: user.userId,
          email: userAttributes.email
        }));
        if (!skipUserIdCookieSync) {
          setUserIdCookie(user.userId);
        }
      }
    }
    getUserAttributes();
  }, [user, skipUserIdCookieSync]);

  const pairCompanion = useCallback((userUuid: string) => {
    setUserIdCookie(userUuid);
  }, []);

  // daily limit for core requests, is just total number of requests
  const hasReachedDailyLimit = false;

  const isUserSubscribed = useMemo(() => {
    const now = new Date();
    return subscriptions.length > 0 &&
      subscriptions.some((sub) => 
        (sub.status === 'active' || sub.status === 'trialing') &&
        sub.currentPeriodStart &&
        now >= new Date(sub.currentPeriodStart)
      );
  }, [subscriptions]);

  const getUserSubscriptionLevel = useCallback((): 'none' | 'super' | 'ultra' => {
    const now = new Date();
    const activeSubscription = subscriptions.find(
      (sub) => (sub.status === 'active' || sub.status === 'trialing') && 
      sub.currentPeriodStart && now >= new Date(sub.currentPeriodStart)
    );
    
    if (!activeSubscription) {
      return 'none';
    }
    
    if (activeSubscription.tier === 'ultra') {
      return 'ultra';
    }
    
    if (activeSubscription.tier === 'super') {
      return 'super';
    }
    
    // If subscription exists but tier is not set, default to 'super' for backward compatibility
    return 'super';
  }, [subscriptions]);

  // daily limit for analysis requests, is total number of requests or total token count
  const hasReachedDailyLimitForAnalysis = useMemo(() => {
    if (isUserSubscribed) return false;

    return documents.filter((document) => document.createdAt > new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()).length >= Number(process.env.NEXT_PUBLIC_DPD_LIMIT)
      || userAnalysisRequests
        .reduce((acc, request) => acc + request.totalTokenCount, 0) >= Number(process.env.NEXT_PUBLIC_TPD_LIMIT);
  }, [userAnalysisRequests, documents, isUserSubscribed]);

  // minute limit for core requests, is total number of requests or total token count in the last minute
  const hasReachedMinuteLimit = false;

  const nextRequestAt = null;

  const nextRequestAtForAnalysis = useMemo(() => {
    // if (hasReachedDailyLimitForAnalysis) {
    //   const date = new Date(userAnalysisRequests[userAnalysisRequests.length - 1].createdAt);
    //   return new Date(date.getTime() + 1000 * 60 * 60 * 24);
    // }
    return null;
  }, [hasReachedDailyLimit, userAnalysisRequests]);

  const userRequestsToday = useMemo(() => {
    return userCoreRequests.length;
  }, [userCoreRequests]);
  const userRequestsLastMinute = userCoreRequests.filter((request) => request.createdAt > new Date(Date.now() - 1000 * 60).toISOString()).length;
  const tokenCountToday = useMemo(() => {
    return userCoreRequests.reduce((acc, request) => acc + request.totalTokenCount, 0);
  }, [userCoreRequests, userAnalysisRequests]);
  const tokenCountLastMinute = userCoreRequests.filter((request) => request.createdAt > new Date(Date.now() - 1000 * 60).toISOString()).reduce((acc, request) => acc + request.totalTokenCount, 0) + userAnalysisRequests.filter((request) => request.createdAt > new Date(Date.now() - 1000 * 60).toISOString()).reduce((acc, request) => acc + request.totalTokenCount, 0);
  const documentCountToday = documents.filter((document) => document.createdAt > new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()).length;
  const documentTokenCountToday = userAnalysisRequests.reduce((acc, request) => acc + request.totalTokenCount, 0);

  const hasReachedDailyLimitForWebSearch = useMemo(() => {
    return userCoreRequests.filter((request) => request.webSearchCalled).length >= 5;
  }, [userCoreRequests]);

  const isAdmin = useMemo(() => {
    return groups.includes('admin');
  }, [groups]);

  const hasFeatureFlag = useCallback((flagName: string) => {
    if (!appSettings) return false;

    if (isAdmin) {
      return appSettings.featureFlags.some((flag) => flag.flagName === flagName && (flag.flagValue === 'admin_only' || flag.flagValue === 'active'));
    }
    return appSettings.featureFlags.some((flag) => flag.flagName === flagName && flag.flagValue === 'active');
  }, [appSettings, isAdmin]);

  return (
    <SessionContext.Provider 
      value={{ 
        userAttributes,
        userProfile: userProfile || null,
        isLoading: false,
        groups,
        isAdmin,
        pairCompanion,
        hasReachedDailyLimitForFreePremiumMessages,
        hasReachedDailyLimit,
        hasReachedDailyLimitForAnalysis,
        hasReachedMinuteLimit,
        userRequestsToday,
        userRequestsLastMinute,
        tokenCountToday,
        tokenCountLastMinute,
        documentCountToday,
        documentTokenCountToday,
        nextRequestAt,
        nextRequestAtForAnalysis,
        hasReachedDailyLimitForWebSearch,
        hasFeatureFlag,
        isUserSubscribed,
        getUserSubscriptionLevel,
        totalDocuments: documents.length
      }}>
      {children}
    </SessionContext.Provider>
  );
} 