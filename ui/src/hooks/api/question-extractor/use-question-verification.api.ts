import { useCallback, useState } from 'react';
import { useAmplifyApiClient } from '@/providers/amplify-provider';
import { useSessionContext } from '@/providers/session-provider';

export function useQuestionVerification() {
  const client = useAmplifyApiClient();
  const { userAttributes } = useSessionContext();
  const [isVerifying, setIsVerifying] = useState(false);

  const verifyQuestions = useCallback(async (questionUuids: string[], verified: boolean) => {
    if (!userAttributes?.userUuid) {
      console.error('User not authenticated');
      return false;
    }

    if (questionUuids.length === 0) {
      console.error('No questions to verify');
      return false;
    }

    setIsVerifying(true);
    try {
      console.log(`${verified ? 'Verifying' : 'Unverifying'} ${questionUuids.length} questions...`);
      
      // Update questions directly using the client
      const updatePromises = questionUuids.map(async (uuid) => {
        try {
          await client.models.ExtractedQuestion.update({
            extractedQuestionUuid: uuid,
            verified: verified,
            verifiedAt: verified ? new Date().toISOString() : null,
            verifiedBy: verified ? userAttributes.userUuid : null,
            updatedAt: new Date().toISOString(),
          });
          return true;
        } catch (error) {
          console.error(`Failed to update question ${uuid}:`, error);
          return false;
        }
      });

      const results = await Promise.all(updatePromises);
      const successCount = results.filter(r => r).length;

      console.log(`Successfully processed ${successCount} out of ${questionUuids.length} questions`);
      
      if (successCount === 0) {
        alert(`Failed to ${verified ? 'verify' : 'unverify'} questions. Please try again.`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error verifying questions:', error);
      alert(`Failed to ${verified ? 'verify' : 'unverify'} questions. Please try again.`);
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, [client, userAttributes]);

  return {
    verifyQuestions,
    isVerifying,
  };
}

