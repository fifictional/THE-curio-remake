import { BaseAgentInput } from "../types";
import { UserTier } from "../../intents";

/**
 * Extended input for chat agents with chat-specific fields
 * Additional fields may be populated by input accessors (e.g., history, spaceUuid, chatTitle)
 */
export interface ChatAgentInput extends BaseAgentInput {
  message: string;
  messageUuid: string;
  userUuid: string;
  chatUuid: string;
  taskUuid: string;
  chatType: 'main' | 'document' | 'question' | 'mock_exam';
  chatArgs: {
    documentUuid?: string;
    mockExamLogUuid?: string;
    questionIndex?: number;
    webSearch?: boolean;
    referenceData?: Array<{
      type: string;
      name: string;
      content: string;
    }>;
    spaceDocumentUuids?: string[];
  };
  image?: string;
  // Fields populated by accessors:
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  spaceUuid?: string | null;
  chatTitle?: string;
  titleChangedByTheUser?: boolean;
  // Document markdown fetched from S3 for document chat type
  documentMarkdown?: string;
  memoryContext?: string;
  masteryContext?: string;
  // Question text for question chat type (fetched from MockExam)
  questionText?: string;
  // Active feature flags for the user (populated by accessor)
  featureFlags?: Array<{
    flagName: string;
    flagValue: 'active' | 'inactive' | 'admin_only';
  }>;
}

/**
 * User information for chat context
 */
export interface UserInfo {
  userDescription: string;
  userHelp: string;
  userTier: UserTier;
  subscriptionTier?: 'super' | 'ultra' | null;
  isAdmin: boolean;
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  messageCount: number;
  messageCountInTheHourBlock: number;
  nextMessageResetAt: string | null;
  allowed: boolean;
  upgradeMessage?: string;
}

/**
 * Generation limits for free users
 */
export interface GenerationLimits {
  flashcardGenerationRequests: number;
  quizGenerationRequests: number;
  practiceTestGenerationRequests: number;
  webSearchGenerationRequests: number;
  flashImageGenerationRequests: number;
  proImageGenerationRequests: number;
}

/**
 * Query intent determined by query-understanding-agent
 */
export type QueryIntent = 'generic_chat' | 'tutor_chat' | 'create_flashcard' | 'create_quiz' | 'create_mock_exam' | 'generate_image';

/**
 * Validation result from validation-agent
 */
export interface ValidationResult {
  completeness: number; // 0-1 score
  quality: number; // 0-1 score
  relevance: number; // 0-1 score
  ruleFollowing: number; // 0-1 score
  isFulfilled: boolean; // Overall fulfillment status
  feedback?: string; // Feedback if not fulfilled
}

/**
 * Chat response with streaming support
 */
export interface ChatResponse {
  responseText: string;
  output?: any[];
  toolCalls?: Array<{
    name: string;
    arguments: string;
  }>;
  citations?: Array<{
    type: string;
    title: string;
    url: string;
    startIndex: number;
    endIndex: number;
  }>;
  webSearchCalled?: boolean;
}

