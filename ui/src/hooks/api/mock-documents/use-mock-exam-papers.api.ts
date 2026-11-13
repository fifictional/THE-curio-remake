import { ExamPaper, ExamPaperQuestion } from "@/lib/types/mock-exam";
import { useAmplifyApiClient } from "@/providers/amplify-provider";
import { useSessionContext } from "@/providers/session-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export const useMockExamPapersApi = () => {
  const client = useAmplifyApiClient();
  const queryClient = useQueryClient();
  const { userAttributes } = useSessionContext();
  
  const getExamPapers = useCallback(async (): Promise<ExamPaper[]> => {
    console.log('getExamPapers called, userAttributes:', userAttributes);
    
    if (!userAttributes?.userUuid) {
      console.error('User not authenticated, userAttributes:', userAttributes);
      throw new Error('User not authenticated');
    }
    
    // Get exam papers using the userUuid secondary index
    const papersRes = await client.models.ExamPaper
      .listExamPaperByUserUuidAndCreatedAt(
        { userUuid: userAttributes.userUuid },
        { sortDirection: 'DESC' }
      );
    
    const papers = papersRes.data ?? [];

    // Get questions for each exam paper
    const results = await Promise.all(
      papers.map(async (exam: any): Promise<ExamPaper> => {
        const qsRes = await client.models.ExamPaperQuestion
          .listExamPaperQuestionByExamPaperUuidAndQuestionNumber(
            { examPaperUuid: exam.examPaperUuid },
            { sortDirection: 'ASC' },
          );
        
        // Serialize the data to remove functions and make it client-safe
        const serializedExam: ExamPaper = {
          examPaperUuid: exam.examPaperUuid,
          title: exam.title,
          description: exam.description,
          examType: exam.examType,
          totalQuestions: exam.totalQuestions,
          documentUuid: exam.documentUuid,
          userUuid: exam.userUuid,
          spaceUuid: exam.spaceUuid,
          paperIndex: exam.paperIndex,
          createdAt: exam.createdAt,
          updatedAt: exam.updatedAt,
          questions: [],
        };
        
        const serializedQuestions: ExamPaperQuestion[] = (qsRes.data ?? []).map((question: any): ExamPaperQuestion => ({
          examPaperQuestionUuid: question.examPaperQuestionUuid,
          examPaperUuid: question.examPaperUuid,
          questionNumber: question.questionNumber,
          questionContent: question.questionContent,
          questionOptions: question.questionOptions,
          questionType: question.questionType,
          questionHint: question.questionHint,
          questionAnswerExplanations: question.questionAnswerExplanations,
          questionReference: question.questionReference,
          moduleName: question.moduleName,
          moduleNumber: question.moduleNumber,
          questionExamName: question.questionExamName,
          questionExamSubject: question.questionExamSubject,
          questionTopic: question.questionTopic,
          difficultyLevel: question.difficultyLevel,
          verified: question.verified,
          createdAt: question.createdAt,
          updatedAt: question.updatedAt,
        }));
        
        return { ...serializedExam, questions: serializedQuestions };
      })
    );
    
    return results;
  }, [client, userAttributes]);

  const updateQuestionVerification = useCallback(async (questionUuid: string, verified: boolean): Promise<void> => {
    console.log('updateQuestionVerification called:', { questionUuid, verified });
    
    const res = await client.models.ExamPaperQuestion.update({
      examPaperQuestionUuid: questionUuid,
      verified,
    });
    
    if (!res.data) {
      throw new Error('Failed to update question');
    }

    // No need to serialize and return - optimistic update handles the UI
  }, [client]);

  const updateQuestion = useCallback(async (data: {
    questionUuid: string;
    questionContent?: string;
    questionOptions?: string[];
    questionHint?: string;
    questionAnswerExplanations?: string[];
  }): Promise<void> => {
    console.log('updateQuestion called:', data);
    
    const res = await client.models.ExamPaperQuestion.update({
      examPaperQuestionUuid: data.questionUuid,
      questionContent: data.questionContent,
      questionOptions: data.questionOptions,
      questionHint: data.questionHint,
      questionAnswerExplanations: data.questionAnswerExplanations,
    });
    
    if (!res.data) {
      throw new Error('Failed to update question');
    }
  }, [client]);

  // Queries
  const {
    data: examPapers = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['mockExamPapers'],
    queryFn: getExamPapers,
  });

  // Mutations
  const updateVerificationMutation = useMutation({
    mutationFn: ({ questionUuid, verified }: { questionUuid: string; verified: boolean }) => {
      return updateQuestionVerification(questionUuid, verified);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mockExamPapers'] });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: (data: {
      questionUuid: string;
      questionContent?: string;
      questionOptions?: string[];
      questionHint?: string;
      questionAnswerExplanations?: string[];
    }) => {
      return updateQuestion(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mockExamPapers'] });
    },
  });

  return {
    examPapers,
    isLoading,
    error,
    refetch,
    updateQuestionVerification: updateVerificationMutation.mutateAsync,
    isUpdatingVerification: updateVerificationMutation.isPending,
    updateQuestion: updateQuestionMutation.mutateAsync,
    isUpdatingQuestion: updateQuestionMutation.isPending,
  };
};
