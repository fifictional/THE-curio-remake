export type UserProfile = {
  userUuid: string;
  onboardingCompleted: boolean;
  onboardingSkipped: boolean;
  userEmail?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  userDescription?: string | null;
  userHelp?: string | null;
  country?: string | null;
  freeSATMockExamUuid?: string | null;
  memoryDisabled?: boolean | null;
  academicYear?: string | null;
  lifestage?: string | null;
  course?: string | null;
  intents?: string[] | null;
  userExam?: string | null;
  userTopics?: string | null;
};