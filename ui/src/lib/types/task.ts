export type Task = {
  taskUuid: string;
  documentUuid: string | null;
  messageUuid: string | null;
  userUuid: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | null;
  type: "LAYOUT_DETECTION" | "DOCUMENT_PROCESSING" | "QUESTION_GENERATION" | "FLASHCARD_GENERATION" | "CHAT" | "QUESTION_EXTRACT" | "EXTRACT_MODULES" | "EXTRACT_ANSWER_MODULES" | "GENERATE_QUESTIONS" | null;
  progress: number; // 0-100
  error: string | null;
  result: string | null;
  createdAt: string;
  updatedAt: string;
};
