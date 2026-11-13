/**
 * Providers index - instantiates all providers so they register themselves
 * 
 * This file should be imported early in the application lifecycle to ensure
 * all providers are registered with the ProviderResolver.
 */

import { GPTProvider } from "./gpt-provider";
import { GeminiProvider } from "./gemini-provider";
import { GPTTranscriptionProvider } from "./gpt-transcription-provider";
import { GPTCompletionProvider } from "./gpt-completion-provider";
import { GeminiImageProvider } from "./gemini-image-provider";
import { AnthropicProvider } from "./anthropic-provider";

// Instantiate providers - they will register themselves in their constructors
export const gptProvider = new GPTProvider();
export const geminiProvider = new GeminiProvider();
export const transcriptionProvider = new GPTTranscriptionProvider();
export const completionProvider = new GPTCompletionProvider();
export const geminiImageProvider = new GeminiImageProvider();
export const anthropicProvider = new AnthropicProvider();

// Export types and resolver
export * from "./types";
export * from "./provider-resolver";
export * from "./curio-voices";
export * from "./gpt-provider";
export * from "./gemini-provider";
export * from "./gpt-transcription-provider";
export * from "./gpt-completion-provider";
export * from "./gemini-image-provider";
export * from "./anthropic-provider";


