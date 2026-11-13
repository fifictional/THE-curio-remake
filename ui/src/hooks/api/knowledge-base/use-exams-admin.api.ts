import { useState, useCallback } from "react";
import { useAmplifyUserApiClient } from "@/providers/amplify-provider";
import { Concept } from "./use-concepts-admin.api";

export interface Exam {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExamInput {
  id: string;
  name: string;
  description?: string;
}

export interface UpdateExamInput {
  id: string;
  name?: string;
  description?: string;
}

export function useExamsAdminApi() {
  const userClient = useAmplifyUserApiClient();
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchExams = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await userClient.queries.knowledgeBaseQuery({
        actionType: 'listExams',
      });
      
      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0].message || "Failed to fetch exams";
        throw new Error(errorMessage);
      }

      const examsData = response.data?.exams || [];
      setExams(examsData as Exam[]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred while fetching exams");
      console.error("Failed to fetch exams:", error);
      setError(error);
      setExams([]);
    } finally {
      setIsLoading(false);
    }
  }, [userClient]);

  const createExam = useCallback(async (input: CreateExamInput): Promise<Exam> => {
    setError(null);
    try {
      const response = await userClient.mutations.knowledgeBaseMutation({
        actionType: 'createExam',
        exam: {
          id: input.id,
          name: input.name,
          description: input.description || undefined,
        },
      });
      
      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0].message || "Failed to create exam";
        throw new Error(errorMessage);
      }

      const newExam = response.data?.exam;
      if (!newExam) {
        throw new Error("No exam returned from create mutation");
      }

      // Refresh exams list
      await fetchExams();
      
      return newExam as unknown as Exam;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred while creating exam");
      console.error("Failed to create exam:", error);
      setError(error);
      throw error;
    }
  }, [userClient, fetchExams]);

  const updateExam = useCallback(async (input: UpdateExamInput): Promise<Exam> => {
    setError(null);
    try {
      const response = await userClient.mutations.knowledgeBaseMutation({
        actionType: 'updateExam',
        exam: {
          id: input.id,
          name: input.name,
          description: input.description !== undefined ? input.description : undefined,
        },
      });
      
      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0].message || "Failed to update exam";
        throw new Error(errorMessage);
      }

      const updatedExam = response.data?.exam;
      if (!updatedExam) {
        throw new Error("No exam returned from update mutation");
      }

      // Refresh exams list
      await fetchExams();
      
      return updatedExam as unknown as Exam;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred while updating exam");
      console.error("Failed to update exam:", error);
      setError(error);
      throw error;
    }
  }, [userClient, fetchExams]);

  const deleteExam = useCallback(async (examId: string): Promise<void> => {
    setError(null);
    try {
      const response = await userClient.mutations.knowledgeBaseMutation({
        actionType: 'deleteExam',
        exam: {
          id: examId,
        },
      });
      
      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0].message || "Failed to delete exam";
        throw new Error(errorMessage);
      }

      // Refresh exams list
      await fetchExams();
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred while deleting exam");
      console.error("Failed to delete exam:", error);
      setError(error);
      throw error;
    }
  }, [userClient, fetchExams]);

  const fetchConceptsByExam = useCallback(async (examId: string) => {
    setError(null);
    try {
      const response = await userClient.queries.knowledgeBaseQuery({
        actionType: 'listConceptsByExam',
        examId,
      });
      
      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0].message || "Failed to fetch concepts";
        throw new Error(errorMessage);
      }

      const concepts = response.data?.concepts || [];
      return concepts as Concept[];
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred while fetching concepts");
      console.error("Failed to fetch concepts:", error);
      setError(error);
      throw error;
    }
  }, [userClient]);

  const linkConceptToExam = useCallback(async (conceptId: string, examId: string): Promise<void> => {
    setError(null);
    try {
      const response = await userClient.mutations.knowledgeBaseMutation({
        actionType: 'linkConceptToExam',
        conceptId,
        examId,
      });
      
      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0].message || "Failed to link concept to exam";
        throw new Error(errorMessage);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred while linking concept");
      console.error("Failed to link concept to exam:", error);
      setError(error);
      throw error;
    }
  }, [userClient]);

  const unlinkConceptFromExam = useCallback(async (conceptId: string, examId: string): Promise<void> => {
    setError(null);
    try {
      const response = await userClient.mutations.knowledgeBaseMutation({
        actionType: 'unlinkConceptFromExam',
        conceptId,
        examId,
      });
      
      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0].message || "Failed to unlink concept from exam";
        throw new Error(errorMessage);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred while unlinking concept");
      console.error("Failed to unlink concept from exam:", error);
      setError(error);
      throw error;
    }
  }, [userClient]);

  return {
    exams,
    isLoading,
    error,
    fetchExams,
    createExam,
    updateExam,
    deleteExam,
    fetchConceptsByExam,
    linkConceptToExam,
    unlinkConceptFromExam,
  };
}

