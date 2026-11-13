/**
 * User tier constants
 * These represent the different subscription/access levels
 */
export const TIER = {
  TECHNICAL: 'technical',
  ULTRA: 'ultra',
  SUPER: 'super',
  FREE: 'free',
} as const;

/**
 * User tier type
 */
export type UserTier = typeof TIER[keyof typeof TIER];

