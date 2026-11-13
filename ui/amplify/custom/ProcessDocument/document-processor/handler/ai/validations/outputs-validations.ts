import { error } from 'node:console';
import { z } from 'zod';
  
  
export const FlashcardSchema = z.object({
  title: z.string({ required_error: "missing FlashcardSchema title or title is not string" }).describe('The title of the flashcard'),
  content: z.string({ required_error: "missing FlashcardSchema content or content is not string" }).describe('The content of the flashcard'),
  references: z.array(z.object({
    reference_type: z.string().describe('The type of the reference'),
    reference_name: z.string().describe('The name of the reference'),
    reference_content: z.string().describe('The content of the reference'),
    reference_url: z.string().describe('The url of the reference'),
  })).nonempty({ message: "FlashcardSchema references cannot be empty" }).describe('The references of the flashcard'),
});

export const FlashcardsSchema = z.object({
  flashcards: z.array(FlashcardSchema).nonempty({ message: "FlashcardsSchema flashcards cannot be empty" }).describe('The flashcards of the document'),
});

export type FlashcardsType = z.infer<typeof FlashcardsSchema>;

export const QuestionSchema = z.object({
  question: z.object({
    question_content: z.string({ required_error: "missing QuestionSchema question content or question content is not string" }).describe('The content of the question'),
    question_references: z.array(z.object({
      reference_type: z.string().describe('The type of the reference'),
      reference_name: z.string().describe('The name of the reference'),
      reference_content: z.string().describe('The content of the reference'),
      reference_url: z.string().describe('The url of the reference'),
    })).nonempty({ message: "QuestionSchema question_references cannot be empty" }).describe('The references of the question'),
  }),
  options: z.array(z.string({ required_error: "missing QuestionSchema options or options is not array" })).nonempty({ message: "QuestionSchema options cannot be empty" }).describe('The options of the question'),
  answer: z.number({ required_error: "missing QuestionSchema answer or answer is not number" }).describe('The answer of the question'),
  hint: z.string().optional(),
  answerExplanations: z.array(z.string()).length(4).optional(),
});

export const QuizSchema = z.object({
  questions: z.array(QuestionSchema).nonempty({ message: "QuizSchema questions cannot be empty" }).describe('The questions of the quiz'),
});

export type QuizType = z.infer<typeof QuizSchema>;

export const ContentBlockSchema = z.object({
  documentContentBlockUuid: z.string({ required_error: "missing ContentBlockSchema document content block uuid or document content block uuid is not string" }).describe('The UUID of the content block'),
  content_type: z.string({ required_error: "missing ContentBlockSchema content type or content type is not string" }).describe('The type of the block'),
  content_text: z.string().optional().nullable().describe('The text content of the block'),
  visual_element_type: z.string().optional().nullable().describe('The type of the visual element'),
  visual_element_name: z.string().optional().nullable().describe('The name of the visual element'),
  visual_element_description: z.string().optional().nullable().describe('The description of the visual element'),
  visual_element_caption: z.string().optional().nullable().describe('The caption of the visual element'),
  page_number: z.number({ required_error: "missing ContentBlockSchema page number or page number is not number" }).describe('The page number of the block'),
  bbox: z.array(z.number()).length(4,{ message: "ContentBlockSchema bbox must contain exactly 4 numbers" }).describe('The bounding box of the block'),
});

export const ExtractedSectionSchema = z.object({
  section_name: z.string({ required_error: "missing ExtractedSectionSchema section name or section name is not string" }).describe('The name of the section'),
  page_range: z.string({ required_error: "missing ExtractedSectionSchema page range or page range is not string" }).describe('The page range of the section'),
  section_summary: z.string({ required_error: "missing ExtractedSectionSchema section summary or section summary is not string" }).describe('The summary of the section'),
  section_key_concepts: z.array(z.string({ required_error: "missing ExtractedSectionSchema section key concepts or section key concepts is not array" })).describe('The key concepts of the section'),
  content_blocks: z.array(ContentBlockSchema).nonempty({ message: "ExtractedSectionSchema content_blocks cannot be empty" }).describe('The content blocks of the section'),
});

export const GeminiExtractorResponseSchema = z.object({
  document_type: z.string({ required_error: "missing GeminiExtractorResponseSchema document type or document type is not string" }).describe('The type of the document'),
  subject: z.string({ required_error: "missing GeminiExtractorResponseSchema subject or subject is not string" }).describe('The subject of the document'),
  sections: z.array(ExtractedSectionSchema).nonempty({ message: "GeminiExtractorResponseSchema sections cannot be empty" }).describe('The sections of the document'),
});

export type GeminiExtractorResponseType = z.infer<typeof GeminiExtractorResponseSchema>;

// New schemas for AI Generator outputs
export const DocumentSummarySchema = z.object({
  title: z.string({ required_error: "missing DocumentSummarySchema title or title is not string" }).describe('The title of the document'),
  summary: z.string({ required_error: "missing DocumentSummarySchema summary or summary is not string" }).describe('The summary of the document'),
  tags: z.array(z.string({ required_error: "missing DocumentSummarySchema tags or tags is not array" })).nonempty({ message: "DocumentSummarySchema tags cannot be empty" }).describe('The tags of the document'),
  key_concepts: z.array(z.string()).nonempty({ message: "DocumentSummarySchema key_concepts cannot be empty" }).describe('The key concepts of the document'),
  mind_map: z.union([
    z.string(),
    z.any().transform((val) => typeof val === 'string' ? val : JSON.stringify(val))
  ]).describe('The mind map of the document'),
});

export type DocumentSummaryType = z.infer<typeof DocumentSummarySchema>;

// Validation helper functions
export const validateGeminiExtractorOutput = (data: unknown): GeminiExtractorResponseType => {
  return GeminiExtractorResponseSchema.parse(data);
};

export const validateDocumentSummaryOutput = (data: unknown): DocumentSummaryType => {
  return DocumentSummarySchema.parse(data);
};

export const validateFlashcardsOutput = (data: unknown): FlashcardsType => {
  return FlashcardsSchema.parse(data);
};