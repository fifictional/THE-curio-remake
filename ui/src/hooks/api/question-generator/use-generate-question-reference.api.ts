import { useCallback, useState } from 'react';
import { useAmplifyApiClient } from '@/providers/amplify-provider';

export function useGenerateQuestionReference() {
  const client = useAmplifyApiClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateReference = useCallback(async (extractedQuestionUuid: string): Promise<boolean> => {
    setIsGenerating(true);
    try {
      const response = await client.mutations.generateQuestionReference({
        extractedQuestionUuid,
      });

      if (response.data?.success) {
        console.log('Successfully generated reference');
        return true;
      } else {
        console.error('Reference generation failed');
        alert('Failed to generate reference. Please try again.');
        return false;
      }
    } catch (error) {
      console.error('Error generating reference:', error);
      alert('Failed to generate reference. Please try again.');
      return false;
    } finally {
      setIsGenerating(false);
    }
  }, [client]);

  return {
    generateReference,
    isGenerating,
  };
}

