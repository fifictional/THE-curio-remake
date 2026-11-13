import { useAmplifyApiClient } from "@/providers";
import { useItemApi } from "../use-item.api";
import { UserProfile } from "@/lib/types";

export function useUserProfileApi(userUuid: string | null) {
  const client = useAmplifyApiClient();

  const { data, isLoading } = useItemApi<UserProfile>(userUuid, {
    key: 'user-profile',
    getItemFunc: async (itemUuid) => {
      const response = await client.models.UserProfile.get({ userUuid: itemUuid }, {
        selectionSet: ['userUuid', 'onboardingCompleted', 'onboardingSkipped', 'userEmail', 'firstName', 'lastName', 'userDescription', 'userHelp', 'country', 'freeSATMockExamUuid', 'memoryDisabled', 'academicYear', 'lifestage', 'course', 'intents', 'userExam', 'userTopics'],
      });
      console.log('UserProfile response', response.data);
      return {
        data: {
          ...response.data,
        } as UserProfile,
      };
    },
  });

  return {
    userProfile: data,
    isLoading,
  };
}
