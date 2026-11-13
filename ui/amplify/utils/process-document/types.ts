export type Task = {
  taskUuid: string;
  documentUuid: string;
  userUuid: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | null;
  type: "LAYOUT_DETECTION" | "DOCUMENT_PROCESSING" | "QUESTION_GENERATION" | "FLASHCARD_GENERATION" | null;
  progress: number; // 0-100
};

export type StudentDocument = {
  documentUuid: string;
  spaceUuid: string;
  userUuid: string;
  type: string;
  key: string;
  originalKey: string;
  fileName: string;
  youtubeVideoUuid?: string | null;
};

export type GetTaskResponse = {
  taskUuid: string;
  documentUuid: string;
  userUuid: string;
  type: string;
  status: string;
  progress: number;
  createdAt: number;
  updatedAt: number;
  args: any;
}

export type GetDocumentResponse = {
  documentUuid: string;
  key: string;
  fileName: string;
  type: string;
  spaceUuid: string | null;
  youtubeVideoUuid: string | null;
}

export type GetYoutubeVideoResponse = {
  youtubeVideoUuid: string;
  videoId: string;
  title: string;
  transcriptKey: string;
}

export type DocumentContentBlockResponse = {
  documentContentBlockUuid: string;
  bbox: number[];
  content_type: string;
  page_number: number;
  content_text?: string;
  visual_element_type?: string;
  visual_element_name?: string;
  visual_element_description?: string;
  visual_element_caption?: string;
}

export type GetDocumentSectionResponse = {
  documentSectionUuid: string;
  documentUuid: string;
  documentType: string;
  subject: string;
  sectionName: string;
  pageRange: string;
  sectionSummary: string;
  sectionKeyConcepts: string[];
  sectionContent: DocumentContentBlockResponse[];
}

export type GetDocumentExtractedContentResponse = {
  documentExtractedContentUuid: string;
  documentUuid: string;
  documentType: string;
  subject: string;
  sectionName: string;
  pageRange: string;
  sectionSummary: string;
  sectionKeyConcepts: string[];
  sectionContent: string;
}

export type FlashcardsType = {
  flashcards: Array<{
    title: string;
    content: string;
  }>;
}

export type GetDocumentSummaryResponse = {
  documentSummaryUuid: string;
  documentUuid: string;
  title: string;
  summary: string;
  tags: string[];
  keyConcepts: string[];
  markdown: string;
  enrichedMarkdown: string;
}

export type QuizType = {
  questions: Array<{
    question: string;
    options: string[];
    answer: string;
  }>;
}

