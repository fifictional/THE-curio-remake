import { useCallback, useState } from 'react';
import { useAmplifyApiClient } from '@/providers/amplify-provider';
import { useSessionContext } from '@/providers/session-provider';
import { v4 as uuidv4 } from 'uuid';

export function useFreeSATMockExam() {
  const client = useAmplifyApiClient();
  const { userAttributes, userProfile } = useSessionContext();
  const [isCreating, setIsCreating] = useState(false);

  const getOrCreateFreeSATMockExam = useCallback(async (): Promise<string | null> => {
    if (!userAttributes?.userUuid) {
      console.error('User not authenticated');
      return null;
    }

    setIsCreating(true);
    try {
      // 1. Check if user already has a free SAT mock exam (from session context)
      if (userProfile?.freeSATMockExamUuid) {
        console.log('User already has a free SAT mock exam:', userProfile.freeSATMockExamUuid);
        setIsCreating(false);
        return userProfile.freeSATMockExamUuid;
      }

      // 2. Create a new free SAT mock exam
      const mockExamUuid = uuidv4();
      const chatUuid = uuidv4(); // Create a dummy chat UUID for the free exam
      
      console.log('Creating free SAT mock exam...');
      
      const mockExamResponse = await client.models.MockExam.create({
        mockExamUuid,
        userUuid: userAttributes.userUuid,
        spaceUuid: null,
        chatUuid,
        title: '🎯 Free SAT Practice Test',
        creationStatus: 'CREATED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        questions: [],
        mockExamInfo: {
          description: `**Experience the SAT with real, verified questions!**

Get a taste of what Curio's SAT preparation has to offer:

✨ **10 handpicked questions** from Math and Reading & Writing modules

📊 **Instant feedback** with detailed explanations

💡 **Smart hints** to guide you when you're stuck

⏱️ **No time pressure** - take as long as you need

This free practice test gives you a real feel for the full SAT question bank. Ready to see how you measure up?`,
          topic: 'SAT', // General SAT to pull from all modules
          difficulty: 'medium',
          time: 0, // No time limit for free trial
          questionCount: 10, // 10 questions for free trial
          instructions: 'Answer the following SAT questions to get a feel for the test format.',
          moduleUuids: [], // Will be filled by the question generator
        },
      });

      if (mockExamResponse.errors) {
        console.error('Error creating mock exam:', mockExamResponse.errors);
        return null;
      }

      // 3. Create a task to generate questions
      const taskUuid = uuidv4();
      await client.models.Task.create({
        taskUuid,
        userUuid: userAttributes.userUuid,
        type: 'QUESTION_GENERATION',
        status: 'PENDING',
        args: JSON.stringify({
          mockExamUuid,
          userUuid: userAttributes.userUuid,
        }),
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 4. Update user profile with the free SAT mock exam UUID
      const updateProfileResponse = await client.models.UserProfile.update({
        userUuid: userAttributes.userUuid,
        freeSATMockExamUuid: mockExamUuid,
      });

      if (updateProfileResponse.errors) {
        console.error('Error updating user profile:', updateProfileResponse.errors);
        // Don't fail the whole operation if profile update fails
      }

      console.log('Successfully created free SAT mock exam:', mockExamUuid);
      return mockExamUuid;
    } catch (error) {
      console.error('Error in getOrCreateFreeSATMockExam:', error);
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [client, userAttributes, userProfile]);

  return {
    getOrCreateFreeSATMockExam,
    isCreating,
  };
}

