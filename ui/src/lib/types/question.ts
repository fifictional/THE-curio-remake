export type Question = {
  questionUuid: string;
  userUuid: string;
  spaceUuid: string | null;
  documentUuid: string | null;
  questionContent: string;
  questionReferences: QuestionReference[];
  options: string[];
  answer: number;
  hint?: string | null;
  answerExplanations?: string[] | null;
  createdAt: string;
  updatedAt: string;
  vote?: 'up' | 'down' | null;
};

export type QuestionReference = {
  reference_type?: string;
  reference_name?: string;
  reference_content?: string;
  reference_url?: string;
};