import { useState, useCallback } from "react";
import { useAmplifyUserApiClient } from "@/providers/amplify-provider";

export interface Term {
  id: string;
  term: string;
  definition: string;
  context?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTermInput {
  id: string;
  term: string;
  definition: string;
  context?: string;
  conceptId: string; // Required to link term to concept
}

export interface UpdateTermInput {
  id: string;
  term?: string;
  definition?: string;
  context?: string;
}

export function useTermsAdminApi(conceptId?: string) {
  const userClient = useAmplifyUserApiClient();
  const [terms, setTerms] = useState<Term[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTerms = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await userClient.queries.knowledgeBaseQuery({
        actionType: 'listTerms',
        conceptId: conceptId || undefined,
      });
      
      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0].message || "Failed to fetch terms";
        throw new Error(errorMessage);
      }

      const termsData = response.data?.terms || [];
      setTerms(termsData as Term[]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred while fetching terms");
      console.error("Failed to fetch terms:", error);
      setError(error);
      setTerms([]);
    } finally {
      setIsLoading(false);
    }
  }, [userClient, conceptId]);

  const createTerm = useCallback(async (input: CreateTermInput): Promise<Term> => {
    setError(null);
    try {
      const response = await userClient.mutations.knowledgeBaseMutation({
        actionType: 'createTerm',
        term: {
          id: input.id,
          term: input.term,
          definition: input.definition,
          context: input.context || undefined,
          conceptId: input.conceptId,
        },
      });
      
      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0].message || "Failed to create term";
        throw new Error(errorMessage);
      }

      const newTerm = response.data?.term;
      if (!newTerm) {
        throw new Error("No term returned from create mutation");
      }

      // Refresh terms list
      await fetchTerms();
      
      return newTerm as unknown as Term;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred while creating term");
      console.error("Failed to create term:", error);
      setError(error);
      throw error;
    }
  }, [userClient, fetchTerms]);

  const updateTerm = useCallback(async (input: UpdateTermInput): Promise<Term> => {
    setError(null);
    try {
      const response = await userClient.mutations.knowledgeBaseMutation({
        actionType: 'updateTerm',
        term: {
          id: input.id,
          term: input.term,
          definition: input.definition,
          context: input.context !== undefined ? input.context : undefined,
        },
      });
      
      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0].message || "Failed to update term";
        throw new Error(errorMessage);
      }

      const updatedTerm = response.data?.term;
      if (!updatedTerm) {
        throw new Error("No term returned from update mutation");
      }

      // Refresh terms list
      await fetchTerms();
      
      return updatedTerm as unknown as Term;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred while updating term");
      console.error("Failed to update term:", error);
      setError(error);
      throw error;
    }
  }, [userClient, fetchTerms]);

  const deleteTerm = useCallback(async (termId: string): Promise<void> => {
    setError(null);
    try {
      const response = await userClient.mutations.knowledgeBaseMutation({
        actionType: 'deleteTerm',
        term: {
          id: termId,
        },
      });
      
      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0].message || "Failed to delete term";
        throw new Error(errorMessage);
      }

      // Refresh terms list
      await fetchTerms();
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred while deleting term");
      console.error("Failed to delete term:", error);
      setError(error);
      throw error;
    }
  }, [userClient, fetchTerms]);

  return {
    terms,
    isLoading,
    error,
    fetchTerms,
    createTerm,
    updateTerm,
    deleteTerm,
  };
}

