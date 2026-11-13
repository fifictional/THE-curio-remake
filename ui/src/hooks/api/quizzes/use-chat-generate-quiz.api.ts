import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";

interface ChatGenerateQuizApiProps {
  messageUuid: string;
  userUuid: string;
  sourceUuid: string;
  sourceType: 'document' | 'chat';
  quiz: { title: string; description: string; difficulty: string; questionCount: number };
}

const useChatGenerateQuizApi = () => {
  const generateQuiz = useCallback(async (quiz: ChatGenerateQuizApiProps) => {
    const response = await fetch("/api/quizzes/create", {
      method: "POST",
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(quiz),
    });
    if (!response.ok) {
      throw new Error('Failed to create quiz');
    }
    return response.json();
  }, []);

  useMutation({
    mutationFn: generateQuiz,
  });

  return {
    generateQuiz,
  };
}

export default useChatGenerateQuizApi;