/**
 * Gemini Model Constants
 * 
 * This file contains all Google Gemini models supported by the Gemini provider.
 * If a model is removed from this object, TypeScript will catch references to it
 * in other parts of the codebase, forcing updates to those locations.
 * 
 * Usage: GEMINI.GEMINI_3_PRO_PREVIEW returns 'gemini-3-pro-preview'
 */

export const GEMINI = {
  GEMINI_3_PRO_PREVIEW: 'gemini-3-pro-preview',
  GEMINI_3_PRO_IMAGE_PREVIEW: 'gemini-3-pro-image-preview',
  GEMINI_3_FLASH_PREVIEW: 'gemini-3-flash-preview',
  GEMINI_3_1_FLASH_LITE_PREVIEW: 'gemini-3.1-flash-lite',
  GEMINI_2_5_PRO: 'gemini-2.5-pro',
  GEMINI_2_5_PRO_PREVIEW_TTS: 'gemini-2.5-pro-preview-tts',
  GEMINI_2_5_FLASH: 'gemini-2.5-flash',
  GEMINI_2_5_FLASH_PREVIEW_09_2025: 'gemini-2.5-flash-preview-09-2025',
  GEMINI_2_5_FLASH_IMAGE: 'gemini-2.5-flash-image',
  GEMINI_2_5_FLASH_NATIVE_AUDIO_PREVIEW_12_2025: 'gemini-2.5-flash-native-audio-preview-12-2025',
  GEMINI_2_5_FLASH_PREVIEW_TTS: 'gemini-2.5-flash-preview-tts',
  GEMINI_2_5_FLASH_LITE: 'gemini-2.5-flash-lite',
  GEMINI_2_5_FLASH_LITE_PREVIEW_09_2025: 'gemini-2.5-flash-lite-preview-09-2025',
  GEMINI_2_0_FLASH: 'gemini-2.0-flash',
  GEMINI_2_0_FLASH_PREVIEW_IMAGE_GENERATION: 'gemini-2.0-flash-preview-image-generation',
  GEMINI_2_0_FLASH_LITE: 'gemini-2.0-flash-lite',
} as const;

/**
 * Type export for use in other files
 */
export type GeminiModel = typeof GEMINI[keyof typeof GEMINI];
