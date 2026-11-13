import { useState, useCallback } from 'react';
import type { LearningProfile } from '@/components/satus-onboarding/onboarding-assessment';
import { useAmplifyApiClient } from '@/providers/amplify-provider';
import { getConceptIdFromDisplay } from '@/lib/data/sat-assessment-questions';
import { useSessionContext } from '@/providers/session-provider';

const STORAGE_KEY = 'sat_learning_profile';

export function useSaveLearningProfile() {
  const client = useAmplifyApiClient();
  const { userAttributes } = useSessionContext();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveLearningProfile = useCallback(async (
    learningProfile: LearningProfile,
    userUuid?: string
  ): Promise<boolean> => {
    setIsSaving(true);
    setError(null);

    try {
      if (userUuid) {
        // User is authenticated - save to Neptune
        console.log('Saving learning profile to Neptune for user:', userUuid);
        console.log('Total concepts to save:', Object.keys(learningProfile.subtopicMasteries).length);

        // Prepare batch updates
        const updates = Object.entries(learningProfile.subtopicMasteries).map(
          ([subtopicDisplay, mastery]) => {
            const conceptId = getConceptIdFromDisplay(subtopicDisplay);
            return {
              conceptId,
              masteryLevel: Math.round(mastery.mastery), // Ensure it's an integer
            };
          }
        );

        // Use batch update for efficiency
        const result = await client.mutations.learningProfileMutation({
          actionType: 'batchUpdateConceptMastery',
          userUuid,
          updates,
          email: userAttributes?.email || undefined,
          firstName: userAttributes?.givenName || undefined,
          lastName: userAttributes?.familyName || undefined,
        });

        if (result.data?.success) {
          console.log(`✓ Learning profile saved to Neptune successfully! Updated ${result.data.updatedCount} concepts.`);
          return true;
        } else {
          throw new Error('Failed to save learning profile to Neptune');
        }
      } else {
        // User is not authenticated - save to localStorage
        console.log('Saving learning profile to localStorage');
        
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(learningProfile));
          console.log('✓ Learning profile saved to localStorage successfully!');
          return true;
        } catch (storageError) {
          console.error('Failed to save to localStorage:', storageError);
          throw new Error('Failed to save learning profile to local storage');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save learning profile';
      console.error('Error saving learning profile:', err);
      setError(errorMessage);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [client, userAttributes]);

  const loadFromLocalStorage = useCallback((): LearningProfile | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as LearningProfile;
      }
    } catch (error) {
      console.error('Failed to load learning profile from localStorage:', error);
    }
    return null;
  }, []);

  const clearLocalStorage = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('✓ Cleared learning profile from localStorage');
    } catch (error) {
      console.error('Failed to clear learning profile from localStorage:', error);
    }
  }, []);

  return {
    saveLearningProfile,
    loadFromLocalStorage,
    clearLocalStorage,
    isSaving,
    error,
  };
}

