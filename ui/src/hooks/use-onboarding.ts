'use client';

import { useCallback, useEffect } from 'react';
import { useSessionContext } from '@/providers/session-provider';
import { useAmplifyApiClient, useAnalytics } from '@/providers';

export interface OnboardingData {
  userDescription?: string;
  userHelp?: string;
  country?: string;
  lifestage?: string;
  intents?: string[];
  // EOPRD-814: Variant B extended personalisation fields
  course?: string;
  exam?: string;
  examDate?: string;
  topics?: string;
}

export function useOnboarding() {
  const { userProfile, userAttributes } = useSessionContext();
  const apiClient = useAmplifyApiClient();
  const { track } = useAnalytics();

  // Create user profile if it doesn't exist
  useEffect(() => {
    if (!userProfile && userAttributes?.userUuid) {
      // Check localStorage for any onboarding data from the flow pages
      const userDescription = localStorage.getItem('userDescription');
      const userHelp = localStorage.getItem('userHelp');
      const country = localStorage.getItem('country');
      
      apiClient.models.UserProfile.create({
        userUuid: userAttributes.userUuid,
        onboardingCompleted: false,
        onboardingSkipped: false,
        ...(userDescription && { userDescription }),
        ...(userHelp && { userHelp }),
        ...(country && { country }),
      });

      // Clear localStorage after persisting to database
      if (userDescription) localStorage.removeItem('userDescription');
      if (userHelp) localStorage.removeItem('userHelp');
      if (country) localStorage.removeItem('country');
    }
  }, [userProfile, userAttributes?.userUuid, apiClient]);

  // Auto-complete onboarding if user returns from successful checkout
  useEffect(() => {
    const checkAndCompleteOnboarding = async () => {
      if (userProfile && !userProfile.onboardingCompleted && !userProfile.onboardingSkipped && userAttributes?.userUuid) {
        // Check if user came back from successful purchase
        const urlParams = new URLSearchParams(window.location.search);
        const purchaseParam = urlParams.get('p');
        
        if (purchaseParam && (purchaseParam === 'SUPER_CURIO_MONTHLY' || purchaseParam === 'SUPER_CURIO_ANNUAL' || purchaseParam === 'SUPER_CURIO_6MONTHS' || purchaseParam === 'SATUS-001')) {
          // User completed a purchase, auto-complete onboarding
          track('onboarding_auto_completed_after_purchase', { sku: purchaseParam });
          await apiClient.models.UserProfile.update({ 
            userUuid: userAttributes.userUuid, 
            onboardingCompleted: true 
          });
        }
      }
    };
    
    checkAndCompleteOnboarding();
  }, [userProfile, userAttributes, apiClient, track]);

  const updateOnboardingData = useCallback(async (data: OnboardingData, variant?: string) => {
    if (!userAttributes?.userUuid) return;

    const updateData: any = {
      userUuid: userAttributes.userUuid,
    };

    if (data.userDescription !== undefined) updateData.userDescription = data.userDescription;
    if (data.userHelp !== undefined) updateData.userHelp = data.userHelp;
    if (data.country !== undefined) updateData.country = data.country;

    // EOPRD-814: Persist structured Variant B fields. We also keep mirroring lifestage into
    // `userDescription` and the intent list into `userHelp` so the AI chat agent (which
    // injects those two as human-readable user context) continues to work unchanged.
    if (data.lifestage !== undefined) {
      updateData.lifestage = data.lifestage;
      updateData.userDescription = data.lifestage;
    }
    if (data.intents !== undefined) {
      updateData.intents = data.intents;
      updateData.userHelp = JSON.stringify(data.intents);
    }
    if (data.course !== undefined) updateData.course = data.course;
    if (data.exam !== undefined) updateData.userExam = data.exam;
    if (data.examDate !== undefined) updateData.userExamDate = data.examDate;
    if (data.topics !== undefined) updateData.userTopics = data.topics;

    await apiClient.models.UserProfile.update(updateData);
  }, [userAttributes?.userUuid, apiClient]);

  const completeOnboarding = useCallback(async (variant?: string) => {
    if (!userAttributes?.userUuid) return;

    track('onboarding_completed', variant ? { variant } : undefined);
    await apiClient.models.UserProfile.update({ 
      userUuid: userAttributes.userUuid, 
      onboardingCompleted: true 
    });
  }, [userAttributes?.userUuid, apiClient, track]);

  const skipOnboarding = useCallback(async (variant?: string) => {
    if (!userAttributes?.userUuid) return;

    track('onboarding_skipped', variant ? { variant } : undefined);
    await apiClient.models.UserProfile.update({ 
      userUuid: userAttributes.userUuid, 
      onboardingSkipped: true 
    });
  }, [userAttributes?.userUuid, apiClient, track]);

  const hasToShowOnboarding = !!userProfile && !userProfile.onboardingCompleted && !userProfile.onboardingSkipped;

  return {
    userProfile,
    hasToShowOnboarding,
    updateOnboardingData,
    completeOnboarding,
    skipOnboarding,
  };
}
