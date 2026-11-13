import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";

export const useDeleteMockExamApi = () => {
  const deleteMockExam = useCallback(async (mockExamUuid: string) => {
    const response = await fetch(`/api/mock-exams/${mockExamUuid}`, {
      method: 'DELETE',
    });

    if (response.status !== 200) {
      throw new Error('Failed to delete mock exam');
    }

    return response.json();
  }, []);

  return useMutation({
    mutationFn: deleteMockExam,
  });
}