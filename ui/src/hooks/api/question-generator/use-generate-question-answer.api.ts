import { useCallback, useState } from 'react';
import { useAmplifyApiClient } from '@/providers/amplify-provider';

export function useGenerateQuestionAnswer() {
  const client = useAmplifyApiClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateAnswer = useCallback(async (extractedQuestionUuid: string): Promise<boolean> => {
    setIsGenerating(true);
    try {
      const response = await client.mutations.generateQuestionAnswer({
        extractedQuestionUuid,
      });

      if (response.data?.success) {
        console.log('Successfully generated answer');
        return true;
      } else {
        console.error('Answer generation failed');
        alert('Failed to generate answer. Please try again.');
        return false;
      }
    } catch (error) {
      console.error('Error generating answer:', error);
      alert('Failed to generate answer. Please try again.');
      return false;
    } finally {
      setIsGenerating(false);
    }
  }, [client]);

  return {
    generateAnswer,
    isGenerating,
  };
}

