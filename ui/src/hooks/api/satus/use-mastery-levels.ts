import { useMemo } from 'react';
import { SAT_MATH_CONCEPT_IDS, SAT_RW_CONCEPT_IDS } from '@/lib/data/sat-assessment-questions';

interface MasteryLevels {
  mathMastery: number;
  englishMastery: number;
}

interface LearningProfileItem {
  concept: string;
  masteryLevel: number;
}

export function useMasteryLevels(learningProfile?: LearningProfileItem[]): MasteryLevels {
  return useMemo(() => {
    if (!learningProfile || learningProfile.length === 0) {
      return { mathMastery: 0, englishMastery: 0 };
    }

    const mathConceptSet = new Set(SAT_MATH_CONCEPT_IDS);
    const englishConceptSet = new Set(SAT_RW_CONCEPT_IDS);

    const mathConcepts = learningProfile.filter(item => 
      mathConceptSet.has(item.concept as any)
    );
    const englishConcepts = learningProfile.filter(item => 
      englishConceptSet.has(item.concept as any)
    );

    const mathMastery = mathConcepts.length > 0
      ? Math.round(mathConcepts.reduce((sum, item) => sum + item.masteryLevel, 0) / mathConcepts.length)
      : 0;

    const englishMastery = englishConcepts.length > 0
      ? Math.round(englishConcepts.reduce((sum, item) => sum + item.masteryLevel, 0) / englishConcepts.length)
      : 0;

    return { mathMastery, englishMastery };
  }, [learningProfile]);
}

