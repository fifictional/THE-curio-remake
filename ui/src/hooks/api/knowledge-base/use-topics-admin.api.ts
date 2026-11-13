import { useState, useCallback } from "react";
import { useAmplifyUserApiClient } from "@/providers/amplify-provider";

export interface Topic {
  id: string;
  displayName: string;
  description?: string;
  order?: number;
  createdAt: string;
  updatedAt: string;
  // Lists (arrays of strings)
  conceptsList?: string[];
  subjectsList?: string[];
}

export interface CreateTopicInput {
  id: string;
  displayName: string;
  description?: string;
  order?: number;
  subjectId?: string; // Optional: link topic to subject (can be linked later)
}

export interface UpdateTopicInput {
  id: string;
  displayName?: string;
  description?: string;
  order?: number;
}

export function useTopicsAdminApi(subjectId?: string) {
  const userClient = useAmplifyUserApiClient();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTopics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await userClient.queries.knowledgeBaseQuery({
        actionType: 'listTopics',
        subjectId: subjectId || undefined,
      });

      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0].message || "Failed to fetch topics";
        throw new Error(errorMessage);
      }

      const topicsData = response.data?.topics || [];
      setTopics(topicsData as Topic[]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred while fetching topics");
      console.error("Failed to fetch topics:", error);
      setError(error);
      setTopics([]);
    } finally {
      setIsLoading(false);
    }
  }, [userClient, subjectId]);

  const createTopic = useCallback(async (input: CreateTopicInput): Promise<Topic> => {
    setError(null);
    try {
      const response = await userClient.mutations.knowledgeBaseMutation({
        actionType: 'createTopic',
        topic: {
          id: input.id,
          displayName: input.displayName,
          description: input.description || undefined,
          order: input.order || undefined,
          subjectId: input.subjectId,
        },
      });
      
      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0].message || "Failed to create topic";
        throw new Error(errorMessage);
      }

      const newTopic = response.data?.topic;
      if (!newTopic) {
        throw new Error("No topic returned from create mutation");
      }

      // Refresh topics list
      await fetchTopics();
      
      return newTopic as unknown as Topic;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred while creating topic");
      console.error("Failed to create topic:", error);
      setError(error);
      throw error;
    }
  }, [userClient, fetchTopics]);

  const updateTopic = useCallback(async (input: UpdateTopicInput): Promise<Topic> => {
    setError(null);
    try {
      const response = await userClient.mutations.knowledgeBaseMutation({
        actionType: 'updateTopic',
        topic: {
          id: input.id,
          displayName: input.displayName,
          description: input.description !== undefined ? input.description : undefined,
          order: input.order !== undefined ? input.order : undefined,
        },
      });
      
      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0].message || "Failed to update topic";
        throw new Error(errorMessage);
      }

      const updatedTopic = response.data?.topic;
      if (!updatedTopic) {
        throw new Error("No topic returned from update mutation");
      }

      // Refresh topics list
      await fetchTopics();
      
      return updatedTopic as unknown as Topic;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred while updating topic");
      console.error("Failed to update topic:", error);
      setError(error);
      throw error;
    }
  }, [userClient, fetchTopics]);

  const deleteTopic = useCallback(async (topicId: string): Promise<void> => {
    setError(null);
    try {
      const response = await userClient.mutations.knowledgeBaseMutation({
        actionType: 'deleteTopic',
        topic: {
          id: topicId,
        },
      });
      
      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0].message || "Failed to delete topic";
        throw new Error(errorMessage);
      }

      // Refresh topics list
      await fetchTopics();
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred while deleting topic");
      console.error("Failed to delete topic:", error);
      setError(error);
      throw error;
    }
  }, [userClient, fetchTopics]);

  return {
    topics,
    isLoading,
    error,
    fetchTopics,
    createTopic,
    updateTopic,
    deleteTopic,
  };
}

