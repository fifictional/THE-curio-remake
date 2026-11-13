export type Quiz = {
  quizUuid: string;
  userUuid: string;

  state: 'GENERATING' | 'GENERATED' | 'FAILED';

  sourceType: 'document' | 'chat';
  sourceUuid: string;

  questionCount: number;

  attempts: QuizAttempt[];
};

export type QuizAttempt = {
  quizAttemptUuid: string;
  userUuid: string;
  quizUuid: string;
  
  score: number;
  total: number;
};