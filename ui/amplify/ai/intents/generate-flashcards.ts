import { IntentHandler, TierModelMap } from "./types";
import { TIER, UserTier } from "./tier";
import { AllModels } from "@ai-providers/all-models";
import { GEMINI } from "@ai-providers/gemini-models";
import { ANTHROPIC } from "@ai-providers/anthropic-models";

/**
 * Generate flashcards intent - generates flashcards from documents or content
 * Returns models in priority order (first model is tried first)
 */
export const getModelForIntent: IntentHandler = (userTier: UserTier): AllModels[] => {
  const MODELS: TierModelMap = {
    [TIER.TECHNICAL]: [GEMINI.GEMINI_3_1_FLASH_LITE_PREVIEW],
    [TIER.ULTRA]: [ANTHROPIC.CLAUDE_SONNET_4],
    [TIER.SUPER]: [ANTHROPIC.CLAUDE_SONNET_4],
  };

  return (userTier in MODELS ? MODELS[userTier as keyof TierModelMap] : undefined) || [GEMINI.GEMINI_3_1_FLASH_LITE_PREVIEW];
};
