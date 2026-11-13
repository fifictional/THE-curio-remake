import { IntentName, IntentHandler, INTENT } from "./types";
import { UserTier } from "./tier";
import * as chatIntent from "./chat";
import * as generateQuestionsIntent from "./generate-questions";
import * as generateReferencesIntent from "./generate-references";
import * as generateFlashcardsIntent from "./generate-flashcards";
import * as generateImageIntent from "./generate-image";
import * as documentSummaryIntent from "./document-summary";
import * as documentConversionIntent from "./document-conversion";
import * as documentCategorizationIntent from "./document-categorization";
import * as extractModulesIntent from "./extract-modules";
import * as extractQuestionsIntent from "./extract-questions";
import * as extractAnswersIntent from "./extract-answers";
import * as memoryReflectionIntent from "./memory-reflection";

/**
 * Intent registry - maps intent names to their handlers
 */
const intentRegistry: Record<IntentName, IntentHandler> = {
  [INTENT.CHAT]: chatIntent.getModelForIntent,
  [INTENT.GENERATE_QUESTIONS]: generateQuestionsIntent.getModelForIntent,
  [INTENT.GENERATE_REFERENCES]: generateReferencesIntent.getModelForIntent,
  [INTENT.GENERATE_FLASHCARDS]: generateFlashcardsIntent.getModelForIntent,
  [INTENT.GENERATE_IMAGE]: generateImageIntent.getModelForIntent,
  [INTENT.DOCUMENT_SUMMARY]: documentSummaryIntent.getModelForIntent,
  [INTENT.DOCUMENT_CONVERSION]: documentConversionIntent.getModelForIntent,
  [INTENT.DOCUMENT_CATEGORIZATION]: documentCategorizationIntent.getModelForIntent,
  [INTENT.EXTRACT_MODULES]: extractModulesIntent.getModelForIntent,
  [INTENT.EXTRACT_QUESTIONS]: extractQuestionsIntent.getModelForIntent,
  [INTENT.EXTRACT_ANSWERS]: extractAnswersIntent.getModelForIntent,
  [INTENT.MEMORY_REFLECTION]: memoryReflectionIntent.getModelForIntent,
};

/**
 * Get models for a given intent and user tier
 * @param intent - The intent name
 * @param userTier - The user's tier (free, super, ultra, or technical)
 * @returns Array of models in priority order
 */
export function getModelsForIntent(
  intent: IntentName,
  userTier: UserTier
): ReturnType<IntentHandler> {
  const handler = intentRegistry[intent];
  if (!handler) {
    throw new Error(`Unknown intent: ${intent}`);
  }
  return handler(userTier);
}

/**
 * Export types and constants for use in other files
 */
export type { IntentName } from "@ai-intents/types";
export { INTENT } from "@ai-intents/types";
export { TIER } from "@ai-intents/tier";
export type { UserTier } from "@ai-intents/tier";


