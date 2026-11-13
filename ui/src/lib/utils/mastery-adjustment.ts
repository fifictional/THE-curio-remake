/**
 * Mastery Adjustment Utilities
 * 
 * Provides functions to calculate mastery level adjustments based on
 * question difficulty and current mastery level.
 * 
 * @example
 * ```typescript
 * // Get adjustment values
 * const adjustment = getMasteryAdjustment(45, 'medium');
 * // Returns: { correct: 3, incorrect: -3 }
 * 
 * // Apply adjustment directly
 * const newMastery = applyMasteryAdjustment(45, 'medium', true);
 * // Returns: 48 (45 + 3)
 * 
 * const newMastery2 = applyMasteryAdjustment(45, 'medium', false);
 * // Returns: 42 (45 - 3)
 * ```
 */

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface MasteryAdjustment {
  correct: number;
  incorrect: number;
}

/**
 * Get the mastery adjustment values based on current mastery level and difficulty
 * 
 * @param currentMastery - Current mastery level (0-100)
 * @param difficulty - Question difficulty ('easy', 'medium', 'hard')
 * @returns Object with correct and incorrect adjustment values
 */
export function getMasteryAdjustment(
  currentMastery: number,
  difficulty: QuestionDifficulty
): MasteryAdjustment {
  // Mastery < 50
  if (currentMastery < 50) {
    switch (difficulty) {
      case 'easy':
        return { correct: 1, incorrect: -5 };
      case 'medium':
        return { correct: 3, incorrect: -3 };
      case 'hard':
        return { correct: 5, incorrect: -1 };
    }
  }
  
  // Mastery 51-75
  if (currentMastery >= 51 && currentMastery <= 75) {
    switch (difficulty) {
      case 'easy':
        return { correct: 1, incorrect: -6 };
      case 'medium':
        return { correct: 2, incorrect: -5 };
      case 'hard':
        return { correct: 3, incorrect: -2 };
    }
  }
  
  // Mastery 76-90
  if (currentMastery >= 76 && currentMastery <= 90) {
    switch (difficulty) {
      case 'easy':
        return { correct: 0, incorrect: -8 };
      case 'medium':
        return { correct: 2, incorrect: -5 };
      case 'hard':
        return { correct: 2, incorrect: -3 };
    }
  }
  
  // Mastery 91-95
  if (currentMastery >= 91 && currentMastery <= 95) {
    switch (difficulty) {
      case 'easy':
        return { correct: 0, incorrect: -8 };
      case 'medium':
        return { correct: 1, incorrect: -5 };
      case 'hard':
        return { correct: 1, incorrect: -3 };
    }
  }
  
  // Mastery > 95
  if (currentMastery > 95) {
    switch (difficulty) {
      case 'easy':
        return { correct: 0, incorrect: -8 };
      case 'medium':
        return { correct: 0, incorrect: -5 };
      case 'hard':
        return { correct: 1, incorrect: -3 };
    }
  }
  
  // Default fallback (should not reach here)
  return { correct: 1, incorrect: -3 };
}

/**
 * Apply a mastery adjustment to a current mastery level
 * 
 * @param currentMastery - Current mastery level (0-100)
 * @param difficulty - Question difficulty ('easy', 'medium', 'hard')
 * @param isCorrect - Whether the answer was correct
 * @returns New mastery level, clamped between 0 and 100
 */
export function applyMasteryAdjustment(
  currentMastery: number,
  difficulty: QuestionDifficulty,
  isCorrect: boolean
): number {
  const adjustment = getMasteryAdjustment(currentMastery, difficulty);
  const change = isCorrect ? adjustment.correct : adjustment.incorrect;
  const newMastery = currentMastery + change;
  
  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, newMastery));
}

/**
 * Get a mastery level description
 * 
 * @param mastery - Mastery level (0-100)
 * @returns Human-readable description
 */
export function getMasteryDescription(mastery: number): string {
  if (mastery < 30) return 'Needs Practice';
  if (mastery < 50) return 'Developing';
  if (mastery < 70) return 'Proficient';
  if (mastery < 85) return 'Advanced';
  if (mastery < 95) return 'Expert';
  return 'Mastered';
}

/**
 * Get a color class for mastery level (Tailwind CSS)
 * 
 * @param mastery - Mastery level (0-100)
 * @returns Tailwind color class
 */
export function getMasteryColor(mastery: number): string {
  if (mastery < 30) return 'text-red-600';
  if (mastery < 50) return 'text-orange-600';
  if (mastery < 70) return 'text-yellow-600';
  if (mastery < 85) return 'text-blue-600';
  if (mastery < 95) return 'text-green-600';
  return 'text-emerald-600';
}

