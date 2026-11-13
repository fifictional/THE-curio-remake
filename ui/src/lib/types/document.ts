export type StudentDocument = {
  documentUuid: string;
  userUuid: string;
  spaceUuid: string | null;
  spaceName: string | null;
  key: string;
  originalKey: string | null;
  type: string;
  fileName: string;
  documentCount: number | null;
  hasRagEmbeddings?: boolean | null;
  createdAt: string;
  updatedAt: string;  
  youtubeVideoUuid: string | null;
  lastQuizScore?: number | null;
  lastQuizTotal?: number | null;
  chatUuid: string | null;
};

export type StudentDocumentWithFlashcardsCount = {
  documentUuid: string;
  key: string;
  originalKey: string;
  fileName: string;
  createdAt: string;
  flashcardsCount: number;
}

export type StudentDocumentWithSummary = StudentDocument & {
  documentSummaries: StudentDocumentSummary[];
};

export type StudentDocumentSummary = {
  documentSummaryUuid: string;
  documentUuid: string;
  title: string;
  summary: string;
  tags: string[];
  keyConcepts: string[];
  vote?: 'up' | 'down' | null;
  status?: 'started' | 'streaming' | 'completed' | 'error' | null;
}

export type Question = {
  question: string;
  answer: string;
};

export type StudentDocumentVisionOutput = {
  documentExtractedContentUuid: string;
  documentUuid: string;
  documentType: string;
  subject: string;
  sectionContent: {
    bbox: number[];
    content_type: 'passage' | 'question' | 'question_options' | 'instructions' | 'definition' | 'summary' | 'visual_element';
    content_text: string;
    page_number: string;
    visual_element_type: string;
    image_name: string;
    description: string;
    caption: string;
  }[];
  sectionName: string;
  pageRange: string;
  sectionSummary: string;
  sectionKeyConcepts: string[];
}

export type EntitySchema = {
  type: 'Person' | 'Date' | 'Location' | 'Organization' | 'Concept' | 'Other';
  text: string;
  relevanceScore: number;
};

export type TableSchema = {
  headers: string[];
  rows: string[][];
};

export type ImageSchema = {
  caption: string | null;
  url: string | null;
};

export type SectionSchema = {
  sectionTitle: string;
  text: string;
  summary: string;
  tags: string[];
  keyPoints: string[];
  entities: EntitySchema[];
  tables: TableSchema[];
  images: ImageSchema[];
};

export type MetadataSchema = {
  author: string | null;
  createdDate: string | null; // YYYY-MM-DD format
  language: string;
  sourceUrl: string | null;
};

export type ExtractedDataSchema = {
  definitions: Record<string, string>;
  formulas: string[];
  dates: string[]; // YYYY-MM-DD format
  numbers: string[];
  references: string[];
  questions: string[];
};

export type ProcessingMetadataSchema = {
  extractionModelVersion: string;
  extractedAt: string; // ISO8601 timestamp
  processingTimeMs: number;
};
