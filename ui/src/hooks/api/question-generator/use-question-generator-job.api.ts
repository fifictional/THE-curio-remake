import { useCallback, useEffect, useState } from 'react';
import { useAmplifyApiClient } from '@/providers/amplify-provider';
import { ExtractedQuestion } from '../question-extractor/use-question-extractor.api';

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

export function useQuestionGeneratorJobApi(jobUuid: string) {
  const client = useAmplifyApiClient();
  
  const [currentJob, setCurrentJob] = useState<QuestionGenerationJob | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<ExtractedQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);

  // Fetch job details
  const fetchJob = useCallback(async () => {
    try {
      const response = await client.models.QuestionGenerationJob.get({
        questionGenerationJobUuid: jobUuid,
      });

      if (response.data) {
        setCurrentJob({
          questionGenerationJobUuid: response.data.questionGenerationJobUuid,
          userUuid: response.data.userUuid,
          prompt: response.data.prompt,
          status: response.data.status ?? undefined,
          totalQuestions: response.data.totalQuestions ?? undefined,
          error: response.data.error ?? undefined,
          generationLogs: response.data.generationLogs ?? undefined,
          createdAt: response.data.createdAt,
          updatedAt: response.data.updatedAt,
        });
      }
    } catch (error) {
      console.error('Error fetching generation job:', error);
    }
  }, [client, jobUuid]);

  // Fetch generated questions
  const fetchGeneratedQuestions = useCallback(async () => {
    setIsLoadingQuestions(true);
    try {
      // Fetch all questions for this generation job with pagination
      const allQuestions: any[] = [];
      let nextToken: string | null | undefined = null;
      
      do {
        const response: any = await client.models.ExtractedQuestion.list({
          filter: {
            questionGenerationJobUuid: { eq: jobUuid }
          },
          limit: 1000,
          nextToken: nextToken || undefined
        });
        
        if (response.data) {
          allQuestions.push(...response.data);
        }
        
        nextToken = response.nextToken;
      } while (nextToken);

      // Map to ExtractedQuestion type
      const questions: ExtractedQuestion[] = allQuestions.map(q => ({
        extractedQuestionUuid: q.extractedQuestionUuid,
        questionExtractJobUuid: q.questionExtractJobUuid ?? undefined,
        questionGenerationJobUuid: q.questionGenerationJobUuid ?? undefined,
        moduleNumber: q.moduleNumber,
        questionNumber: q.questionNumber,
        questionContent: q.questionContent,
        questionType: q.questionType,
        questionOptions: q.questionOptions || [],
        correctAnswer: q.correctAnswer ?? undefined,
        answerExplanations: q.answerExplanations ?? undefined,
        hint: q.hint ?? undefined,
        questionReference: q.questionReference ? {
          referenceType: q.questionReference.referenceType,
          page: q.questionReference.page,
          boundingBox: q.questionReference.boundingBox || [],
          s3Key: q.questionReference.s3Key ?? undefined,
        } : undefined,
        referenceExtractionStatus: q.referenceExtractionStatus,
        referenceExtractionError: q.referenceExtractionError ?? undefined,
        needsReference: q.needsReference ?? undefined,
        referenceGenerationPrompt: q.referenceGenerationPrompt ?? undefined,
        isGenerated: q.isGenerated ?? undefined,
        exam: q.exam,
        module: q.module,
        topic: q.topic ?? undefined,
        subtopic: q.subtopic ?? undefined,
        concept: q.concept ?? undefined,
        difficulty: q.difficulty,
        examModuleUuid: q.examModuleUuid ?? undefined,
        verified: q.verified ?? undefined,
        verifiedAt: q.verifiedAt ?? undefined,
        verifiedBy: q.verifiedBy ?? undefined,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      }));

      setGeneratedQuestions(questions);
    } catch (error) {
      console.error('Error fetching generated questions:', error);
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [client, jobUuid]);

  // Load data on mount
  useEffect(() => {
    fetchJob();
    fetchGeneratedQuestions();
  }, [fetchJob, fetchGeneratedQuestions]);

  // Set up real-time subscription for job updates
  useEffect(() => {
    const subscription = client.models.QuestionGenerationJob.observeQuery({
      filter: {
        questionGenerationJobUuid: { eq: jobUuid }
      }
    }).subscribe({
      next: ({ items }) => {
        if (items.length > 0) {
          const job = items[0];
          setCurrentJob({
            questionGenerationJobUuid: job.questionGenerationJobUuid,
            userUuid: job.userUuid,
            prompt: job.prompt,
            status: job.status ?? undefined,
            totalQuestions: job.totalQuestions ?? undefined,
            error: job.error ?? undefined,
            generationLogs: job.generationLogs ?? undefined,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
          });
        }
      },
      error: (error) => console.error('Subscription error:', error)
    });

    return () => subscription.unsubscribe();
  }, [client, jobUuid]);

  return {
    currentJob,
    generatedQuestions,
    isLoadingQuestions,
    refetchJob: fetchJob,
    refetchQuestions: fetchGeneratedQuestions,
  };
}

