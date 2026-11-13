// SAT Topics and Subtopics Structure (Matching Database Concept IDs)
// These IDs match the 'concept' field in TopicSubtopicConcept table
export const SAT_TOPIC_GROUPS = [
  // Reading & Writing Groups (English)
  {
    id: 'literacy',
    name: 'Understanding Passages',
    emoji: '📖',
    category: 'Reading & Writing',
    topic: 'english',
    subtopics: [
      { id: 'text-purpose-tone', display: 'Text Purpose & Tone' },
      { id: 'word-choice-meaning', display: 'Word Choice & Meaning' },
      { id: 'text-structure', display: 'Text Structure' }
    ]
  },
  {
    id: 'discourse',
    name: 'Information & Ideas',
    emoji: '💡',
    category: 'Reading & Writing',
    topic: 'english',
    subtopics: [
      { id: 'main-idea-central-theme', display: 'Main Idea & Central Theme' },
      { id: 'supporting-evidence', display: 'Supporting Evidence' },
      { id: 'data-interpretation-in-texts', display: 'Data Interpretation in Texts' }
    ]
  },
  {
    id: 'articulation',
    name: 'Improving Sentences & Flow',
    emoji: '✍️',
    category: 'Reading & Writing',
    topic: 'english',
    subtopics: [
      { id: 'organization-logical-flow', display: 'Organization & Logical Flow' },
      { id: 'style-precision', display: 'Style & Precision' }
    ]
  },
  {
    id: 'conventions',
    name: 'Grammar and Punctuation',
    emoji: '📝',
    category: 'Reading & Writing',
    topic: 'english',
    subtopics: [
      { id: 'sentence-structure', display: 'Sentence Structure' },
      { id: 'grammar-usage', display: 'Grammar & Usage' },
      { id: 'punctuation', display: 'Punctuation' }
    ]
  },
  // Math Groups
  {
    id: 'algebra',
    name: 'Basic Algebra',
    emoji: '📐',
    category: 'Math',
    topic: 'math',
    subtopics: [
      { id: 'linear-equations', display: 'Linear Equations' },
      { id: 'systems-of-equations', display: 'Systems of Equations' },
      { id: 'inequalities-absolute-value', display: 'Inequalities & Absolute Value' },
      { id: 'functions', display: 'Functions' }
    ]
  },
  {
    id: 'advanced-math',
    name: 'Complex Equations and Algebra',
    emoji: '🔢',
    category: 'Math',
    topic: 'math',
    subtopics: [
      { id: 'quadratic-equations', display: 'Quadratic Equations' },
      { id: 'polynomials-rational-expressions', display: 'Polynomials & Rational Expressions' },
      { id: 'exponents-radicals-rational-powers', display: 'Exponents, Radicals & Rational Powers' },
      { id: 'nonlinear-relationships', display: 'Nonlinear Relationships' }
    ]
  },
  {
    id: 'statistics',
    name: 'Data Interpretation',
    emoji: '📈',
    category: 'Math',
    topic: 'math',
    subtopics: [
      { id: 'ratios-proportions', display: 'Ratios & Proportions' },
      { id: 'statistics-probability', display: 'Statistics & Probability' },
      { id: 'data-analysis', display: 'Data Analysis' },
      { id: 'units-rates', display: 'Units & Rates' }
    ]
  },
  {
    id: 'geometry',
    name: 'Geometry',
    emoji: '📊',
    category: 'Math',
    topic: 'math',
    subtopics: [
      { id: 'angles-triangles', display: 'Angles & Triangles' },
      { id: 'circles-polygons', display: 'Circles & Polygons' },
      { id: 'coordinate-geometry', display: 'Coordinate Geometry' },
      { id: 'volume-surface-area', display: 'Volume & Surface Area' }
    ]
  },
  {
    id: 'trigonometry',
    name: 'Trigonometry',
    emoji: '📐',
    category: 'Math',
    topic: 'math',
    subtopics: [
      { id: 'trigonometric-ratios', display: 'Trigonometric Ratios' }
    ]
  },
] as const;

// Helper function to get all concept IDs
export function getAllConceptIds(): string[] {
  return SAT_TOPIC_GROUPS.flatMap(group => 
    group.subtopics.map(subtopic => subtopic.id)
  );
}

// Helper function to get concept display name from ID
export function getConceptDisplay(conceptId: string): string {
  for (const group of SAT_TOPIC_GROUPS) {
    const subtopic = group.subtopics.find(s => s.id === conceptId);
    if (subtopic) return subtopic.display;
  }
  return conceptId;
}

// Helper function to get group info for a concept
export function getGroupForConcept(conceptId: string) {
  return SAT_TOPIC_GROUPS.find(group => 
    group.subtopics.some(s => s.id === conceptId)
  );
}

// Helper function to get concept ID from display name
export function getConceptIdFromDisplay(displayName: string): string {
  for (const group of SAT_TOPIC_GROUPS) {
    const subtopic = group.subtopics.find(s => s.display === displayName);
    if (subtopic) return subtopic.id;
  }
  return displayName; // Fallback to the input if not found
}

// Export all concept IDs as flat arrays for convenience
export const SAT_MATH_CONCEPT_IDS = SAT_TOPIC_GROUPS
  .filter(g => g.category === 'Math')
  .flatMap(g => g.subtopics.map(s => s.id));

export const SAT_RW_CONCEPT_IDS = SAT_TOPIC_GROUPS
  .filter(g => g.category === 'Reading & Writing')
  .flatMap(g => g.subtopics.map(s => s.id));

// Legacy structure for backward compatibility (display names only)
export const SAT_TOPICS = {
  math: {
    name: 'Math',
    subtopics: SAT_MATH_CONCEPT_IDS.map(id => getConceptDisplay(id))
  },
  readingWriting: {
    name: 'Reading & Writing',
    subtopics: SAT_RW_CONCEPT_IDS.map(id => getConceptDisplay(id))
  }
} as const;

// Export all subtopics as flat arrays for convenience (backward compatibility)
export const SAT_MATH_SUBTOPICS = SAT_TOPICS.math.subtopics;
export const SAT_RW_SUBTOPICS = SAT_TOPICS.readingWriting.subtopics;

// Assessment Question Type
export interface AssessmentQuestion {
  id: string;
  topic: string; // 'math' or 'english'
  subtopic: string; // subtopic ID (e.g., 'algebra', 'literacy')
  concept: string; // concept ID matching database (e.g., 'linear-equations', 'text-purpose-tone')
  difficulty: 'easy' | 'medium' | 'hard';
  questionContent: string;
  options: string[];
  answer: number; // Index of correct answer
  answerExplanations: string[]; // Explanations for all options (A, B, C, D)
  hint: string;
}

// Scoring ranges for current and target scores
export const SAT_SCORE_RANGES = {
  min: 400,
  max: 1600,
  sections: {
    math: { min: 200, max: 800 },
    readingWriting: { min: 200, max: 800 }
  }
} as const;

// Score level descriptions
export const SCORE_LEVELS = [
  { min: 400, max: 800, level: 'Beginner', description: 'Building foundational skills' },
  { min: 801, max: 1000, level: 'Developing', description: 'Growing understanding' },
  { min: 1001, max: 1200, level: 'Proficient', description: 'Solid performance' },
  { min: 1201, max: 1400, level: 'Advanced', description: 'Strong performance' },
  { min: 1401, max: 1600, level: 'Exceptional', description: 'Outstanding performance' },
] as const;

