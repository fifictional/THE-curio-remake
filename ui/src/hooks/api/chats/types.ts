export interface ReferenceData {
  type: 'text';
  name: string;
  content: string;
}

export type OpenChatArgs = {
  chatUuid: string;
  webSearch: boolean;
  referenceData?: ReferenceData[];
  spaceDocumentUuids?: string[]; // Document UUIDs in the space to reference for RAG
};

export type DocumentChatArgs = {
  documentUuid: string;
  chatUuid: string;
  webSearch: boolean;
};

export type QuestionChatArgs = {
  mockExamLogUuid: string;
  questionIndex?: number;
};

export type MockExamChatArgs = {
  chatUuid: string;
}

export const isOpenChatArgs = (args: ChatArgs): args is OpenChatArgs => {
  return 'chatUuid' in args;
};
export const isDocumentChatArgs = (args: ChatArgs): args is DocumentChatArgs => {
  return 'documentUuid' in args;
};
export const isQuestionChatArgs = (args: ChatArgs): args is QuestionChatArgs => {
  return 'mockExamLogUuid' in args;
};
export const isMockExamChatArgs = (args: ChatArgs): args is MockExamChatArgs => {
  return 'chatUuid' in args;
};

export type ChatArgs = OpenChatArgs | DocumentChatArgs | QuestionChatArgs | MockExamChatArgs;
export type ChatType = 'main' | 'question' | 'mock_exam' | 'document';