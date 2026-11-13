/**
 * OpenAI Model Constants
 * 
 * This file contains all OpenAI models supported across all OpenAI providers.
 * If a model is removed from this object, TypeScript will catch references to it
 * in other parts of the codebase, forcing updates to those locations.
 * 
 * Usage: OPENAI.GPT_5_1 returns 'gpt-5.1'
 * 
 * Models are organized by provider type:
 * - GPT Provider (Responses API)
 * - GPT Completion Provider (Chat Completions API)
 * - GPT Transcription Provider (Audio Transcriptions API)
 */

export const OPENAI = {
  // GPT Provider Models (Responses API)
  GPT_5_2: 'gpt-5.2',
  GPT_5_1: 'gpt-5.1',
  GPT_5: 'gpt-5',
  GPT_5_MINI: 'gpt-5-mini',
  GPT_5_NANO: 'gpt-5-nano',
  GPT_5_1_CODEX: 'gpt-5.1-codex',
  GPT_5_1_CODEX_MAX: 'gpt-5.1-codex-max',
  GPT_5_CODEX: 'gpt-5-codex',
  GPT_5_2_PRO: 'gpt-5.2-pro',
  GPT_5_PRO: 'gpt-5-pro',
  O3_DEEP_RESEARCH: 'o3-deep-research',
  O4_MINI_DEEP_RESEARCH: 'o4-mini-deep-research',
  O3_PRO: 'o3-pro',
  O3: 'o3',
  O4_MINI: 'o4-mini',
  GPT_4_1: 'gpt-4.1',
  GPT_4_1_MINI: 'gpt-4.1-mini',
  GPT_4_1_NANO: 'gpt-4.1-nano',
  O1_PRO: 'o1-pro',
  COMPUTER_USE_PREVIEW: 'computer-use-preview',
  O3_MINI: 'o3-mini',
  O1: 'o1',
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',
  GPT_4_TURBO: 'gpt-4-turbo',
  CHATGPT_4O_LATEST: 'chatgpt-4o-latest',
  GPT_5_1_CODEX_MINI: 'gpt-5.1-codex-mini',
  GPT_3_5_TURBO: 'gpt-3.5-turbo',
  GPT_4: 'gpt-4',
  GPT_5_2_CHAT_LATEST: 'gpt-5.2-chat-latest',
  GPT_5_1_CHAT_LATEST: 'gpt-5.1-chat-latest',
  GPT_5_CHAT_LATEST: 'gpt-5-chat-latest',
  GPT_OSS_120B: 'gpt-oss-120b',
  GPT_OSS_20B: 'gpt-oss-20b',
  
  // GPT Completion Provider Models (Chat Completions API)
  GPT_AUDIO: 'gpt-audio',
  GPT_AUDIO_MINI: 'gpt-audio-mini',
  GPT_4O_AUDIO_PREVIEW: 'gpt-4o-audio-preview',
  GPT_4O_MINI_AUDIO_PREVIEW: 'gpt-4o-mini-audio-preview',
  GPT_4O_SEARCH_PREVIEW: 'gpt-4o-search-preview',
  GPT_4O_MINI_SEARCH_PREVIEW: 'gpt-4o-mini-search-preview',
  
  // GPT Transcription Provider Models (Audio Transcriptions API)
  GPT_4O_TRANSCRIBE: 'gpt-4o-transcribe',
  GPT_4O_TRANSCRIBE_DIARIZE: 'gpt-4o-transcribe-diarize',
  GPT_4O_MINI_TRANSCRIBE: 'gpt-4o-mini-transcribe',
  WHISPER_1: 'whisper-1',
} as const;

/**
 * Type exports for use in other files
 */
export type OpenAIModel = typeof OPENAI[keyof typeof OPENAI];
