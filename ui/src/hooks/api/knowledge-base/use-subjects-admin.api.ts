import { useState, useCallback } from "react";
import { useAmplifyUserApiClient } from "@/providers/amplify-provider";

export interface Subject {
  id: string;
  displayName: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  // List of all topics this subject has (array of display names)
  topicsList?: string[];
}

export interface CreateSubjectInput {
  id: string;
  displayName: string;
  description?: string;
}

export interface UpdateSubjectInput {
  id: string;
  displayName?: string;
  description?: string;
}

export function useSubjectsAdminApi() {
  const userClient = useAmplifyUserApiClient();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchSubjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await userClient.queries.knowledgeBaseQuery({
        actionType: 'listSubjects',
      });

      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0].message || "Failed to fetch subjects";
        throw new Error(errorMessage);
      }

      const subjectsData = (response.data?.subjectsList || []) as Subject[];
      setSubjects(subjectsData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred while fetching subjects");
      console.error("Failed to fetch subjects:", error);
      setError(error);
      setSubjects([]);
    } finally {
      setIsLoading(false);
    }
  }, [userClient]);

  const createSubject = useCallback(async (input: CreateSubjectInput): Promise<Subject> => {
    setError(null);
    try {
      const response = await userClient.mutations.knowledgeBaseMutation({
        actionType: 'createSubject',
        subject: {
        id: input.id,
        displayName: input.displayName,
        description: input.description || undefined,
        },
      });
      
      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0].message || "Failed to create subject";
        throw new Error(errorMessage);
      }

      const newSubject = response.data?.subjectItem as Subject | undefined;
      if (!newSubject) {
        throw new Error("No subject returned from create mutation");
      }

      // Refresh subjects list
      await fetchSubjects();
      
      return newSubject;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred while creating subject");
      console.error("Failed to create subject:", error);
      setError(error);
      throw error;
    }
  }, [userClient, fetchSubjects]);

  const updateSubject = useCallback(async (input: UpdateSubjectInput): Promise<Subject> => {
    setError(null);
    try {
      const response = await userClient.mutations.knowledgeBaseMutation({
        actionType: 'updateSubject',
        subject: {
        id: input.id,
        displayName: input.displayName,
        description: input.description !== undefined ? input.description : undefined,
        },
      });
      
      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0].message || "Failed to update subject";
        throw new Error(errorMessage);
      }

      const updatedSubject = response.data?.subjectItem as Subject | undefined;
      if (!updatedSubject) {
        throw new Error("No subject returned from update mutation");
      }

      // Refresh subjects list
      await fetchSubjects();
      
      return updatedSubject;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred while updating subject");
      console.error("Failed to update subject:", error);
      setError(error);
      throw error;
    }
  }, [userClient, fetchSubjects]);

  const deleteSubject = useCallback(async (subjectId: string): Promise<void> => {
    setError(null);
    try {
      const response = await userClient.mutations.knowledgeBaseMutation({
        actionType: 'deleteSubject',
        subject: {
          id: subjectId,
        },
      });
      
      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0].message || "Failed to delete subject";
        throw new Error(errorMessage);
      }

      // Refresh subjects list
      await fetchSubjects();
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred while deleting subject");
      console.error("Failed to delete subject:", error);
      setError(error);
      throw error;
    }
  }, [userClient, fetchSubjects]);

  return {
    subjects,
    isLoading,
    error,
    fetchSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
  };
}

