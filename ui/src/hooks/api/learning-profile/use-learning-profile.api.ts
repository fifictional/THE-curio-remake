import { useState, useEffect, useCallback } from 'react';
import { useAmplifyApiClient } from '@/providers/amplify-provider';
import { useSessionContext } from '@/providers/session-provider';

export interface UserLearningProfileItem {
  userUuid: string;
  concept: string;
  masteryLevel: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConceptMastery {
  concept: string;
  masteryLevel: number;
  createdAt: string;
  updatedAt: string;
}

export function useLearningProfileApi(userUuid?: string) {
  const client = useAmplifyApiClient();
  const { userAttributes } = useSessionContext();
  const [learningProfile, setLearningProfile] = useState<UserLearningProfileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  const fetchLearningProfile = useCallback(async () => {
    if (!userUuid) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await client.queries.learningProfileQuery({
        actionType: 'getUserLearningProfile',
        userUuid,
      });

      const conceptMasteries = result.data?.conceptMasteries as unknown as ConceptMastery[];

      if (result.data?.success && conceptMasteries) {
        const profileItems: UserLearningProfileItem[] = conceptMasteries.map((item: ConceptMastery) => ({
          userUuid,
          concept: item.concept,
          masteryLevel: item.masteryLevel || 0,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString(),
        }));
        
        setLearningProfile(profileItems);
        setHasProfile(profileItems.length > 0);
      } else {
        setLearningProfile([]);
        setHasProfile(false);
      }
    } catch (error) {
      console.error('Failed to fetch learning profile:', error);
      setHasProfile(false);
      setLearningProfile([]);
    } finally {
      setIsLoading(false);
    }
  }, [userUuid, client]);

  useEffect(() => {
    fetchLearningProfile();
  }, [fetchLearningProfile]);

  const updateMastery = useCallback(async (concept: string, newMasteryLevel: number) => {
    if (!userUuid) return;

    try {
      // Get current mastery level for history
      const existing = learningProfile.find(p => p.concept === concept);
      const oldValue = existing?.masteryLevel || 0;

      // Update the mastery level in Neptune
      await client.mutations.learningProfileMutation({
        actionType: 'createOrUpdateConceptMastery',
        userUuid,
        concept,
        masteryLevel: newMasteryLevel,
        email: userAttributes?.email || undefined,
        firstName: userAttributes?.givenName || undefined,
        lastName: userAttributes?.familyName || undefined,
      });

      // Refresh the profile
      await fetchLearningProfile();
    } catch (error) {
      console.error('Failed to update mastery:', error);
      throw error;
    }
  }, [userUuid, learningProfile, fetchLearningProfile, client, userAttributes]);

  const createOrUpdateMastery = useCallback(async (concept: string, masteryLevel: number) => {
    if (!userUuid) return;

    try {
      // Create or update in Neptune
      await client.mutations.learningProfileMutation({
        actionType: 'createOrUpdateConceptMastery',
        userUuid,
        concept,
        masteryLevel,
        email: userAttributes?.email || undefined,
        firstName: userAttributes?.givenName || undefined,
        lastName: userAttributes?.familyName || undefined,
      });

      // Refresh the profile
      await fetchLearningProfile();
    } catch (error) {
      console.error('Failed to create/update mastery:', error);
      throw error;
    }
  }, [userUuid, fetchLearningProfile, client, userAttributes]);

  const getMasteryForConcept = useCallback((concept: string): number => {
    const profile = learningProfile.find(p => p.concept === concept);
    return profile?.masteryLevel || 0;
  }, [learningProfile]);

  return {
    learningProfile,
    isLoading,
    hasProfile,
    updateMastery,
    createOrUpdateMastery,
    getMasteryForConcept,
    refetch: fetchLearningProfile,
  };
}

