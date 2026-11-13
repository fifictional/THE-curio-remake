import { useCallback, useEffect, useState } from 'react';
import { useAmplifyApiClient } from '@/providers/amplify-provider';
import { useSessionContext } from '@/providers/session-provider';
import { v4 as uuidv4 } from 'uuid';

export interface QuestionGenerationJob {
  questionGenerationJobUuid: string;
  userUuid: string;
  prompt: string;
  status?: 'PENDING' | 'GENERATING_QUESTIONS' | 'GENERATING_REFERENCES' | 'GENERATING_ANSWERS' | 'COMPLETED' | 'FAILED';
  totalQuestions?: number;
  error?: string;
  generationLogs?: string;
  createdAt: string;
  updatedAt: string;
}

export function useQuestionGeneratorApi() {
  const client = useAmplifyApiClient();
  const { userAttributes } = useSessionContext();

  const [isCreating, setIsCreating] = useState(false);
  const [generationJobs, setGenerationJobs] = useState<QuestionGenerationJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);

  // Fetch all generation jobs
  const fetchGenerationJobs = useCallback(async () => {
    if (!userAttributes?.userUuid) return;

    try {
      const response = await client.models.QuestionGenerationJob.list({
        limit: 100,
      });

      if (response.data) {
        const jobs = response.data.map(job => ({
          questionGenerationJobUuid: job.questionGenerationJobUuid,
          userUuid: job.userUuid,
          prompt: job.prompt,
          status: job.status ?? undefined,
          totalQuestions: job.totalQuestions ?? undefined,
          error: job.error ?? undefined,
          generationLogs: job.generationLogs ?? undefined,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
        })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setGenerationJobs(jobs);
      }
    } catch (error) {
      console.error('Error fetching generation jobs:', error);
    } finally {
      setIsLoadingJobs(false);
    }
  }, [client, userAttributes]);

  // Load jobs on mount
  useEffect(() => {
    fetchGenerationJobs();
  }, [fetchGenerationJobs]);

  // Create a new generation job
  const createGenerationJob = useCallback(async (prompt: string): Promise<string | null> => {
    if (!userAttributes?.userUuid) {
      console.error('User not authenticated');
      return null;
    }

    setIsCreating(true);
    try {
      const questionGenerationJobUuid = uuidv4();
      const taskUuid = uuidv4();

      // Create the generation job
      await client.models.QuestionGenerationJob.create({
        questionGenerationJobUuid,
        userUuid: userAttributes.userUuid,
        prompt,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Create a task for the dispatcher
      await client.models.Task.create({
        taskUuid,
        userUuid: userAttributes.userUuid,
        type: 'GENERATE_QUESTIONS',
        status: 'PENDING',
        progress: 0,
        args: JSON.stringify({
          questionGenerationJobUuid,
          prompt,
        }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      console.log('Question generation job created successfully');
      return questionGenerationJobUuid;
    } catch (error) {
      console.error('Error creating generation job:', error);
      alert('Failed to create generation job. Please try again.');
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [client, userAttributes]);

  return {
    createGenerationJob,
    isCreating,
    generationJobs,
    isLoadingJobs,
    refetchJobs: fetchGenerationJobs,
  };
}

