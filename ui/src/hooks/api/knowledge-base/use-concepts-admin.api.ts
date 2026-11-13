import { useState, useCallback } from "react";
import { useAmplifyUserApiClient } from "@/providers/amplify-provider";

export interface Concept {
  id: string;
  displayName: string;
  description?: string;
  difficulty?: number;
  createdAt: string;
  updatedAt: string;
  // Hierarchy information (may be empty if concept is not linked)
  topicId?: string;
  topicDisplayName?: string;
  subjectId?: string;
  subjectDisplayName?: string;
  // Lists (arrays of strings)
  topicsList?: string[];
  termsList?: string[];
  subjectsList?: string[];
}

export interface CreateConceptInput {
  id: string;
  displayName: string;
  description?: string;
  difficulty?: number;
  topicId?: string; // Optional: link concept to topic (concepts can be linked to multiple topics)
}

export interface UpdateConceptInput {
  id: string;
  displayName?: string;
  description?: string;
  difficulty?: number | null;
}

export function useConceptsAdminApi(topicId?: string) {
  const userClient = useAmplifyUserApiClient();
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchConcepts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await userClient.queries.knowledgeBaseQuery({
        actionType: 'listConcepts',
        topicId: topicId || undefined,
      });

      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0].message || "Failed to fetch concepts";
        throw new Error(errorMessage);
      }

      const conceptsData = response.data?.concepts || [];
      setConcepts(conceptsData as Concept[]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred while fetching concepts");
      console.error("Failed to fetch concepts:", error);
      setError(error);
      setConcepts([]);
    } finally {
      setIsLoading(false);
    }
  }, [userClient, topicId]);

  const createConcept = useCallback(async (input: CreateConceptInput): Promise<Concept> => {
    setError(null);
    try {
      const response = await userClient.mutations.knowledgeBaseMutation({
        actionType: 'createConcept',
        concept: {
          id: input.id,
          displayName: input.displayName,
          description: input.description || undefined,
          difficulty: input.difficulty || undefined,
          topicId: input.topicId,
        },
      });
      
      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0].message || "Failed to create concept";
        throw new Error(errorMessage);
      }

      const newConcept = response.data?.concept;
      if (!newConcept) {
        throw new Error("No concept returned from create mutation");
      }

      // Refresh concepts list
      await fetchConcepts();
      
      return newConcept as unknown as Concept;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred while creating concept");
      console.error("Failed to create concept:", error);
      setError(error);
      throw error;
    }
  }, [userClient, fetchConcepts]);

  const updateConcept = useCallback(async (input: UpdateConceptInput): Promise<Concept> => {
    setError(null);
    try {
      const response = await userClient.mutations.knowledgeBaseMutation({
        actionType: 'updateConcept',
        concept: {
          id: input.id,
          displayName: input.displayName,
          description: input.description !== undefined ? input.description : undefined,
          difficulty: input.difficulty !== undefined ? input.difficulty : undefined,
        },
      });
      
      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0].message || "Failed to update concept";
        throw new Error(errorMessage);
      }

      const updatedConcept = response.data?.concept;
      if (!updatedConcept) {
        throw new Error("No concept returned from update mutation");
      }

      // Refresh concepts list
      await fetchConcepts();
      
      return updatedConcept as unknown as Concept;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred while updating concept");
      console.error("Failed to update concept:", error);
      setError(error);
      throw error;
    }
  }, [userClient, fetchConcepts]);

  const deleteConcept = useCallback(async (conceptId: string): Promise<void> => {
    setError(null);
    try {
      const response = await userClient.mutations.knowledgeBaseMutation({
        actionType: 'deleteConcept',
        concept: {
          id: conceptId,
        },
      });
      
      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0].message || "Failed to delete concept";
        throw new Error(errorMessage);
      }

      // Refresh concepts list
      await fetchConcepts();
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred while deleting concept");
      console.error("Failed to delete concept:", error);
      setError(error);
      throw error;
    }
  }, [userClient, fetchConcepts]);

  return {
    concepts,
    isLoading,
    error,
    fetchConcepts,
    createConcept,
    updateConcept,
    deleteConcept,
  };
}

