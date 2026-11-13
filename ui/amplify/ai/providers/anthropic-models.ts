/**
 * Anthropic Model Constants
 * 
 * This file contains all Anthropic models supported by the Anthropic provider.
 * If a model is removed from this object, TypeScript will catch references to it
 * in other parts of the codebase, forcing updates to those locations.
 * 
 * Usage: ANTHROPIC.CLAUDE_SONNET_4 returns 'claude-sonnet-4-20250514'
 */

export const ANTHROPIC = {
  CLAUDE_SONNET_4: 'claude-sonnet-4-6',
} as const;

/**
 * Type export for use in other files
 */
export type AnthropicModel = typeof ANTHROPIC[keyof typeof ANTHROPIC];
