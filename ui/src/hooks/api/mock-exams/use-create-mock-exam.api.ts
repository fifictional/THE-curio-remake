import { useMutation } from "@tanstack/react-query";
import { useAmplifyApiClient } from "@/providers/amplify-provider";
import { useCallback } from "react";

interface CreateMockExamApiProps {
  userUuid: string;
  messageUuid: string;
  title: string;
  description: string;
  topic: string;
  difficulty: string;
  time: number;
  questionCount: number;
  chatUuid: string;
  instructions: string;
  moduleUuids: string[];
}

export const useCreateMockExamApi = () => {
  const client = useAmplifyApiClient();

  const createMockExam = useCallback(async (props: CreateMockExamApiProps) => {
    const response = await fetch("/api/mock-exams", {
      method: "POST",
      body: JSON.stringify(props),
    });
    if (!response.ok) {
      throw new Error('Failed to create test');
    }
    return response.json();
  }, [client]);

  const { mutateAsync: createMockExamMutation } = useMutation({
    mutationFn: createMockExam,
  });

  return {
    createMockExam: createMockExamMutation,
  };
}