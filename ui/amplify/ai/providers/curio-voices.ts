/**
 * Curio Voices - Provider-agnostic voice definitions
 * 
 * These are semantic voice names that map to provider-specific voices.
 * Each Curio voice has a name, description, and providers map them to their specific voices.
 */

export interface CurioVoice {
  /** Curio voice identifier (e.g., 'neutral-balanced') */
  id: string;
  /** Human-readable description of the voice characteristics */
  description: string;
}

/**
 * All 30 Curio voices with their descriptions
 * Based on Gemini's 30 voices, but provider-agnostic
 */
export const CURIO_VOICES: CurioVoice[] = [
  { id: 'neutral-balanced', description: 'Neutral, balanced, versatile' },
  { id: 'clear-resonant', description: 'Clear, resonant, professional' },
  { id: 'expressive-storytelling', description: 'Expressive, storytelling, warm' },
  { id: 'deep-rich', description: 'Deep, rich, authoritative' },
  { id: 'bright-energetic', description: 'Bright, energetic, youthful' },
  { id: 'soft-gentle', description: 'Soft, gentle, calming' },
  { id: 'firm-commanding', description: 'Firm, commanding, mid-range' },
  { id: 'breezy-midrange', description: 'Breezy, mid-range female' },
  { id: 'informative-lower', description: 'Informative, lower-pitched male' },
  { id: 'excitable-midrange', description: 'Excitable, lower mid-range male' },
  { id: 'youthful-higher', description: 'Youthful, higher-pitched female' },
  { id: 'upbeat-midrange', description: 'Upbeat, mid-range male' },
  { id: 'warm-conversational', description: 'Warm, conversational, easy-going' },
  { id: 'confident-assertive', description: 'Confident, assertive, mid-range' },
  { id: 'smooth-flowing', description: 'Smooth, flowing, natural' },
  { id: 'crisp-clear', description: 'Crisp, clear, articulate' },
  { id: 'mellow-relaxed', description: 'Mellow, relaxed, soothing' },
  { id: 'dynamic-vibrant', description: 'Dynamic, vibrant, engaging' },
  { id: 'calm-steady', description: 'Calm, steady, reassuring' },
  { id: 'lively-animated', description: 'Lively, animated, enthusiastic' },
  { id: 'serene-peaceful', description: 'Serene, peaceful, tranquil' },
  { id: 'bold-strong', description: 'Bold, strong, powerful' },
  { id: 'graceful-elegant', description: 'Graceful, elegant, refined' },
  { id: 'cheerful-upbeat', description: 'Cheerful, upbeat, positive' },
  { id: 'grounded-stable', description: 'Grounded, stable, dependable' },
  { id: 'radiant-bright', description: 'Radiant, bright, uplifting' },
  { id: 'sophisticated-polished', description: 'Sophisticated, polished, refined' },
  { id: 'friendly-approachable', description: 'Friendly, approachable, welcoming' },
  { id: 'majestic-grand', description: 'Majestic, grand, impressive' },
  { id: 'harmonious-balanced', description: 'Harmonious, balanced, well-rounded' },
];

/**
 * Get Curio voice by ID
 */
export function getCurioVoice(id: string): CurioVoice | undefined {
  return CURIO_VOICES.find(voice => voice.id === id);
}

/**
 * Get default Curio voice (first one)
 */
export function getDefaultCurioVoice(): CurioVoice {
  return CURIO_VOICES[0];
}
