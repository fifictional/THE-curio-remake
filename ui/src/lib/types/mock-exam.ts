export type MockExam = {
    mockExamUuid: string;
    userUuid: string;
    spaceUuid: string | null;
    chatUuid: string;
    title: string;
    mockExamInfo: MockExamInfo;
    questions: MockExamQuestion[];
    creationStatus: string;
    createdAt: string;
    updatedAt: string;
    mockExamLogs: MockExamLog[];
  };

  export type MockExamQuestion = {
    index: number;
    questionContent: string;
    options: string[];
    answer: number;
    hint: string;
    answerExplanations: string[];
    questionReference?: {
      referenceType: 'image' | 'text' | 'table';
      text?: string;
      externalKey?: string;
    }[];
  };
  
  export type MockExamInfo = {
    description: string;
    questionCount: number;
    topic: string;
    difficulty: string;
    time: number;
    instructions: string;
  };
  
  export type MockExamLog = {
    mockExamLogUuid: string;
    mockExamUuid: string;
    mockExam: MockExam;
    questionAnswers: QuestionAnswer[];
    status: string;
    score: number;
    totalTimeInMilliseconds: number;
    startedAt: string;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  
  export type QuestionAnswer = {
    index: number;
    givenAnswer: number | null;
    answerTimeInMilliseconds: number | null;
    answerAt: string | null;
    chatUuid: string | null;
  };
  
  export type MockExamToolArguments = {
    difficulty: string;
    questionCount: number;
    instructions: string;
    description: string;
    topic: string;
    time: number;
    title: string;
  };

// Exam Paper Processing Types
export type ExamPaperQuestion = {
  examPaperQuestionUuid: string;
  examPaperUuid: string;
  questionNumber: string;
  questionContent: string;
  questionOptions: string[];
  questionType: string;
  questionHint: string;
  questionAnswerExplanations: string[];
  questionReference?: {
    referenceType: 'image' | 'text' | 'table';
    page: number;
    boundingBox?: number[];
    text?: string;
    externalKey?: string;
  }[];
  moduleName?: string;
  moduleNumber?: number;
  questionExamName?: string;
  questionExamSubject?: string;
  questionTopic?: string;
  difficultyLevel?: 'easy' | 'medium' | 'hard';
  verified: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ExamPaper = {
  examPaperUuid: string;
  title: string;
  description?: string;
  examType?: string;
  totalQuestions: number;
  documentUuid: string;
  userUuid: string;
  spaceUuid?: string;
  paperIndex: number;
  createdAt: string;
  updatedAt: string;
  questions: ExamPaperQuestion[];
};