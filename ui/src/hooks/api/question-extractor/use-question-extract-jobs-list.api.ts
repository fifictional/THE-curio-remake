import { useCallback, useEffect, useState } from 'react';
import { useAmplifyApiClient } from '@/providers/amplify-provider';
import { QuestionExtractJob } from './use-question-extractor.api';

export function useQuestionExtractJobsListApi() {
  const client = useAmplifyApiClient();
  const [jobs, setJobs] = useState<QuestionExtractJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await client.models.QuestionExtractJob.list({
        limit: 1000,
      });

      if (response.data) {
        // Sort by createdAt descending
        const sortedJobs = [...response.data].sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setJobs(sortedJobs as QuestionExtractJob[]);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Subscribe to new jobs
  useEffect(() => {
    const subscription = client.models.QuestionExtractJob.onCreate().subscribe({
      next: (data) => {
        console.log('New job created:', data);
        setJobs((prev) => [data as QuestionExtractJob, ...prev]);
      },
      error: (error) => {
        console.error('Subscription error:', error);
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [client]);

  return {
    jobs,
    isLoading,
    refetch: fetchJobs,
  };
}

