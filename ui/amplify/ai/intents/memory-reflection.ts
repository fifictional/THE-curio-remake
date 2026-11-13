import { IntentHandler, TierModelMap } from './types';
import { TIER, UserTier } from './tier';
import { AllModels } from '@ai-providers/all-models';
import { GEMINI } from '@ai-providers/gemini-models';

export const getModelForIntent: IntentHandler = (_userTier: UserTier): AllModels[] => {
  const MODELS: TierModelMap = {
    [TIER.TECHNICAL]: [GEMINI.GEMINI_3_1_FLASH_LITE_PREVIEW],
    [TIER.ULTRA]: [GEMINI.GEMINI_3_1_FLASH_LITE_PREVIEW],
    [TIER.SUPER]: [GEMINI.GEMINI_3_1_FLASH_LITE_PREVIEW],
  };
  return MODELS[TIER.TECHNICAL];
};
