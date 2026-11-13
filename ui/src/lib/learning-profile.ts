import { type LearningProfile, type SubtopicMastery } from '@/components/satus-onboarding/onboarding-assessment';

const STORAGE_KEY = 'sat_learning_profile';

/**
 * Get the learning profile from localStorage
 */
export function getLearningProfile(): LearningProfile | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    return JSON.parse(stored) as LearningProfile;
  } catch (error) {
    console.error('Failed to read learning profile from localStorage:', error);
    return null;
  }
}

/**
 * Save the learning profile to localStorage
 */
export function saveLearningProfile(profile: LearningProfile): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error('Failed to save learning profile to localStorage:', error);
  }
}

/**
 * Clear the learning profile from localStorage
 */
export function clearLearningProfile(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear learning profile from localStorage:', error);
  }
}

/**
 * Get mastery score for a specific subtopic
 */
export function getSubtopicMastery(subtopic: string): SubtopicMastery | null {
  const profile = getLearningProfile();
  if (!profile) return null;
  
  return profile.subtopicMasteries[subtopic] || null;
}

/**
 * Get all subtopics sorted by mastery (lowest first)
 */
export function getWeakestSubtopics(limit: number = 5): SubtopicMastery[] {
  const profile = getLearningProfile();
  if (!profile) return [];
  
  return Object.values(profile.subtopicMasteries)
    .filter(m => m.questionsAnswered > 0) // Only include topics that have been assessed
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, limit);
}

/**
 * Get all subtopics sorted by mastery (highest first)
 */
export function getStrongestSubtopics(limit: number = 5): SubtopicMastery[] {
  const profile = getLearningProfile();
  if (!profile) return [];
  
  return Object.values(profile.subtopicMasteries)
    .filter(m => m.questionsAnswered > 0) // Only include topics that have been assessed
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, limit);
}

/**
 * Get mastery level label based on score
 */
export function getMasteryLevel(mastery: number): {
  label: string;
  color: string;
  emoji: string;
} {
  if (mastery >= 80) {
    return { label: 'Expert', color: 'text-green-600', emoji: '🌟' };
  } else if (mastery >= 65) {
    return { label: 'Proficient', color: 'text-blue-600', emoji: '✅' };
  } else if (mastery >= 50) {
    return { label: 'Developing', color: 'text-yellow-600', emoji: '📚' };
  } else if (mastery >= 35) {
    return { label: 'Needs Work', color: 'text-orange-600', emoji: '⚠️' };
  } else {
    return { label: 'Struggling', color: 'text-red-600', emoji: '🆘' };
  }
}

/**
 * Calculate overall mastery percentage
 */
export function getOverallMastery(): number {
  const profile = getLearningProfile();
  if (!profile) return 0;
  
  const assessedSubtopics = Object.values(profile.subtopicMasteries)
    .filter(m => m.questionsAnswered > 0);
  
  if (assessedSubtopics.length === 0) return 0;
  
  const totalMastery = assessedSubtopics.reduce((sum, m) => sum + m.mastery, 0);
  return Math.round(totalMastery / assessedSubtopics.length);
}

