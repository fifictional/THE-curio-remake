import { AllModels } from "@ai-providers/all-models";
import { TIER, UserTier } from "@ai-intents/tier";

/**
 * Tier-based model mapping type
 * Maps technical, ultra, and super tiers to their model arrays
 */
export type TierModelMap = Record<typeof TIER.TECHNICAL | typeof TIER.ULTRA | typeof TIER.SUPER, AllModels[]>;

/**
 * Intent handler interface
 * Each intent file exports a function that implements this signature
 */
export type IntentHandler = (userTier: UserTier) => AllModels[];

/**
 * Intent constants
 * These represent the different AI operation intents
 */
export const INTENT = {
  CHAT: 'chat',
  GENERATE_QUESTIONS: 'generate-questions',
  GENERATE_REFERENCES: 'generate-references',
  GENERATE_FLASHCARDS: 'generate-flashcards',
  GENERATE_IMAGE: 'generate-image',
  DOCUMENT_SUMMARY: 'document-summary',
  DOCUMENT_CONVERSION: 'document-conversion',
  DOCUMENT_CATEGORIZATION: 'document-categorization',
  EXTRACT_MODULES: 'extract-modules',
  EXTRACT_QUESTIONS: 'extract-questions',
  EXTRACT_ANSWERS: 'extract-answers',
  MEMORY_REFLECTION: 'memory-reflection',
} as const;

/**
 * Intent name type - ensures type safety when referencing intents
 */
export type IntentName = typeof INTENT[keyof typeof INTENT];

