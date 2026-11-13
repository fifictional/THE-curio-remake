import { IntentHandler, TierModelMap } from "./types";
import { TIER, UserTier } from "./tier";
import { AllModels } from "@ai-providers/all-models";
import { GEMINI } from "@ai-providers/gemini-models";

/**
 * Generate image intent - generates images using Gemini image models
 * Returns models in priority order (first model is tried first)
 */
export const getModelForIntent: IntentHandler = (userTier: UserTier): AllModels[] => {
  const MODELS: TierModelMap = {
    [TIER.TECHNICAL]: [GEMINI.GEMINI_3_PRO_IMAGE_PREVIEW],
    [TIER.ULTRA]: [GEMINI.GEMINI_3_PRO_IMAGE_PREVIEW, GEMINI.GEMINI_2_5_FLASH_IMAGE],
    [TIER.SUPER]: [GEMINI.GEMINI_3_PRO_IMAGE_PREVIEW, GEMINI.GEMINI_2_5_FLASH_IMAGE],
  };

  return (userTier in MODELS ? MODELS[userTier as keyof TierModelMap] : undefined) || [GEMINI.GEMINI_2_5_FLASH_IMAGE];
};

