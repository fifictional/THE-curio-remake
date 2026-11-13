import { IntentHandler } from "./types";
import { AllModels } from "@ai-providers/all-models";
import { GEMINI } from "@ai-providers/gemini-models";

/**
 * Document summary intent - summarizes document content
 * Currently uses Gemini models for all tiers
 * Returns models in priority order (first model is tried first)
 */
export const getModelForIntent: IntentHandler = (userTier): AllModels[] => {
  // Currently all users get the same Gemini models for document summary
  // This can be made tier-based in the future if needed
  return [GEMINI.GEMINI_2_5_FLASH];
};

