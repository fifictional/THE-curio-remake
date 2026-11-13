/**
 * SAT Concept Chat Starters
 * 
 * Pre-defined chat prompts for each SAT concept, organized by mastery level.
 * These help students engage with specific topics at their current skill level.
 */

export type MasteryLevel = 'beginner' | 'improving' | 'perfection';

export interface ConceptChat {
  conceptId: string;
  conceptDisplay: string;
  topic: 'math' | 'english';
  masteryLevel: MasteryLevel;
  masteryRange: { min: number; max: number };
  prompts: string[];
  emoji: string;
  color: string;
}

export const SAT_CONCEPT_CHATS: ConceptChat[] = [
  // ========== MATH CONCEPTS ==========
  
  // Linear Equations
  {
    conceptId: 'linear-equations',
    conceptDisplay: 'Linear Equations',
    topic: 'math',
    masteryLevel: 'beginner',
    masteryRange: { min: 0, max: 49 },
    prompts: [
      'What is a linear equation and how do I solve for x?',
      'Can you explain the basics of solving equations like 2x + 5 = 13?',
      'I\'m confused about isolating variables. Can you help?',
    ],
    emoji: '📏',
    color: 'blue',
  },
  {
    conceptId: 'linear-equations',
    conceptDisplay: 'Linear Equations',
    topic: 'math',
    masteryLevel: 'improving',
    masteryRange: { min: 50, max: 79 },
    prompts: [
      'How do I solve multi-step linear equations with variables on both sides?',
      'What are the best strategies for checking my work in linear equations?',
      'Can you show me word problems involving linear equations?',
    ],
    emoji: '📏',
    color: 'blue',
  },
  {
    conceptId: 'linear-equations',
    conceptDisplay: 'Linear Equations',
    topic: 'math',
    masteryLevel: 'perfection',
    masteryRange: { min: 80, max: 100 },
    prompts: [
      'What are the trickiest SAT linear equation problems and how do I solve them quickly?',
      'Show me advanced techniques for solving complex linear equations under time pressure',
    ],
    emoji: '📏',
    color: 'blue',
  },

  // Systems of Equations
  {
    conceptId: 'systems-of-equations',
    conceptDisplay: 'Systems of Equations',
    topic: 'math',
    masteryLevel: 'beginner',
    masteryRange: { min: 0, max: 49 },
    prompts: [
      'What is a system of equations and how do I solve it?',
      'Can you explain substitution and elimination methods?',
      'I don\'t understand how to solve two equations together',
    ],
    emoji: '🔗',
    color: 'blue',
  },
  {
    conceptId: 'systems-of-equations',
    conceptDisplay: 'Systems of Equations',
    topic: 'math',
    masteryLevel: 'improving',
    masteryRange: { min: 50, max: 79 },
    prompts: [
      'When should I use substitution vs elimination for systems of equations?',
      'How do I solve systems with fractions or decimals?',
    ],
    emoji: '🔗',
    color: 'blue',
  },
  {
    conceptId: 'systems-of-equations',
    conceptDisplay: 'Systems of Equations',
    topic: 'math',
    masteryLevel: 'perfection',
    masteryRange: { min: 80, max: 100 },
    prompts: [
      'What are the fastest methods for solving SAT systems of equations?',
      'Show me advanced systems of equations with three variables',
    ],
    emoji: '🔗',
    color: 'blue',
  },

  // Quadratic Equations
  {
    conceptId: 'quadratic-equations',
    conceptDisplay: 'Quadratic Equations',
    topic: 'math',
    masteryLevel: 'beginner',
    masteryRange: { min: 0, max: 49 },
    prompts: [
      'What is a quadratic equation and how is it different from linear?',
      'Can you teach me how to factor simple quadratics?',
      'I\'m struggling with x² equations. Where do I start?',
    ],
    emoji: '📈',
    color: 'green',
  },
  {
    conceptId: 'quadratic-equations',
    conceptDisplay: 'Quadratic Equations',
    topic: 'math',
    masteryLevel: 'improving',
    masteryRange: { min: 50, max: 79 },
    prompts: [
      'How do I use the quadratic formula effectively?',
      'When should I factor vs use the quadratic formula?',
      'Can you explain completing the square?',
    ],
    emoji: '📈',
    color: 'green',
  },
  {
    conceptId: 'quadratic-equations',
    conceptDisplay: 'Quadratic Equations',
    topic: 'math',
    masteryLevel: 'perfection',
    masteryRange: { min: 80, max: 100 },
    prompts: [
      'What are the most efficient ways to solve quadratics on the SAT?',
      'Show me complex quadratic word problems and shortcuts',
    ],
    emoji: '📈',
    color: 'green',
  },

  // Functions
  {
    conceptId: 'functions',
    conceptDisplay: 'Functions',
    topic: 'math',
    masteryLevel: 'beginner',
    masteryRange: { min: 0, max: 49 },
    prompts: [
      'What is a function and what does f(x) mean?',
      'How do I evaluate functions like f(3) when f(x) = 2x + 1?',
      'I\'m confused about function notation. Can you explain?',
    ],
    emoji: '🔢',
    color: 'purple',
  },
  {
    conceptId: 'functions',
    conceptDisplay: 'Functions',
    topic: 'math',
    masteryLevel: 'improving',
    masteryRange: { min: 50, max: 79 },
    prompts: [
      'How do I work with composite functions like f(g(x))?',
      'What are domain and range and how do I find them?',
    ],
    emoji: '🔢',
    color: 'purple',
  },
  {
    conceptId: 'functions',
    conceptDisplay: 'Functions',
    topic: 'math',
    masteryLevel: 'perfection',
    masteryRange: { min: 80, max: 100 },
    prompts: [
      'Show me advanced function transformation problems',
      'What are the trickiest SAT function questions?',
    ],
    emoji: '🔢',
    color: 'purple',
  },

  // Circles & Polygons
  {
    conceptId: 'circles-polygons',
    conceptDisplay: 'Circles & Polygons',
    topic: 'math',
    masteryLevel: 'beginner',
    masteryRange: { min: 0, max: 49 },
    prompts: [
      'How do I calculate the area and circumference of a circle?',
      'What are the basic formulas for rectangles and triangles?',
      'I need help with basic geometry shapes',
    ],
    emoji: '⭕',
    color: 'orange',
  },
  {
    conceptId: 'circles-polygons',
    conceptDisplay: 'Circles & Polygons',
    topic: 'math',
    masteryLevel: 'improving',
    masteryRange: { min: 50, max: 79 },
    prompts: [
      'How do I solve problems with sectors and arcs?',
      'What are the properties of different polygons I need to know?',
    ],
    emoji: '⭕',
    color: 'orange',
  },
  {
    conceptId: 'circles-polygons',
    conceptDisplay: 'Circles & Polygons',
    topic: 'math',
    masteryLevel: 'perfection',
    masteryRange: { min: 80, max: 100 },
    prompts: [
      'Show me complex circle and polygon problems from real SATs',
      'What are advanced techniques for geometry problems?',
    ],
    emoji: '⭕',
    color: 'orange',
  },

  // Statistics & Probability
  {
    conceptId: 'statistics-probability',
    conceptDisplay: 'Statistics & Probability',
    topic: 'math',
    masteryLevel: 'beginner',
    masteryRange: { min: 0, max: 49 },
    prompts: [
      'What is mean, median, and mode? How do I calculate them?',
      'Can you explain basic probability concepts?',
      'I\'m confused about averages. Can you help?',
    ],
    emoji: '📊',
    color: 'teal',
  },
  {
    conceptId: 'statistics-probability',
    conceptDisplay: 'Statistics & Probability',
    topic: 'math',
    masteryLevel: 'improving',
    masteryRange: { min: 50, max: 79 },
    prompts: [
      'How do I interpret data from graphs and charts?',
      'What are standard deviation and probability distributions?',
    ],
    emoji: '📊',
    color: 'teal',
  },
  {
    conceptId: 'statistics-probability',
    conceptDisplay: 'Statistics & Probability',
    topic: 'math',
    masteryLevel: 'perfection',
    masteryRange: { min: 80, max: 100 },
    prompts: [
      'Show me advanced statistics problems with multiple data sets',
      'What are the hardest probability questions on the SAT?',
    ],
    emoji: '📊',
    color: 'teal',
  },

  // Ratios & Proportions
  {
    conceptId: 'ratios-proportions',
    conceptDisplay: 'Ratios & Proportions',
    topic: 'math',
    masteryLevel: 'beginner',
    masteryRange: { min: 0, max: 49 },
    prompts: [
      'What is a ratio and how do I solve proportion problems?',
      'Can you explain percentages and how to calculate them?',
      'I need help understanding ratios',
    ],
    emoji: '⚖️',
    color: 'pink',
  },
  {
    conceptId: 'ratios-proportions',
    conceptDisplay: 'Ratios & Proportions',
    topic: 'math',
    masteryLevel: 'improving',
    masteryRange: { min: 50, max: 79 },
    prompts: [
      'How do I solve complex proportion word problems?',
      'What are the best strategies for percentage increase/decrease problems?',
    ],
    emoji: '⚖️',
    color: 'pink',
  },
  {
    conceptId: 'ratios-proportions',
    conceptDisplay: 'Ratios & Proportions',
    topic: 'math',
    masteryLevel: 'perfection',
    masteryRange: { min: 80, max: 100 },
    prompts: [
      'Show me the trickiest SAT ratio and proportion problems',
      'What are shortcuts for solving proportion problems quickly?',
    ],
    emoji: '⚖️',
    color: 'pink',
  },

  // ========== ENGLISH CONCEPTS ==========

  // Grammar & Usage
  {
    conceptId: 'grammar-usage',
    conceptDisplay: 'Grammar & Usage',
    topic: 'english',
    masteryLevel: 'beginner',
    masteryRange: { min: 0, max: 49 },
    prompts: [
      'What are the basic grammar rules I need to know for the SAT?',
      'Can you explain subject-verb agreement?',
      'I\'m confused about pronoun usage. Can you help?',
    ],
    emoji: '✍️',
    color: 'blue',
  },
  {
    conceptId: 'grammar-usage',
    conceptDisplay: 'Grammar & Usage',
    topic: 'english',
    masteryLevel: 'improving',
    masteryRange: { min: 50, max: 79 },
    prompts: [
      'How do I identify and fix verb tense errors?',
      'What are the most common grammar mistakes on the SAT?',
    ],
    emoji: '✍️',
    color: 'blue',
  },
  {
    conceptId: 'grammar-usage',
    conceptDisplay: 'Grammar & Usage',
    topic: 'english',
    masteryLevel: 'perfection',
    masteryRange: { min: 80, max: 100 },
    prompts: [
      'Show me the most subtle grammar errors that appear on the SAT',
      'What are advanced grammar rules I need to master?',
    ],
    emoji: '✍️',
    color: 'blue',
  },

  // Punctuation
  {
    conceptId: 'punctuation',
    conceptDisplay: 'Punctuation',
    topic: 'english',
    masteryLevel: 'beginner',
    masteryRange: { min: 0, max: 49 },
    prompts: [
      'When do I use commas, semicolons, and colons?',
      'Can you explain basic punctuation rules?',
      'I\'m confused about apostrophes. Can you help?',
    ],
    emoji: '📝',
    color: 'green',
  },
  {
    conceptId: 'punctuation',
    conceptDisplay: 'Punctuation',
    topic: 'english',
    masteryLevel: 'improving',
    masteryRange: { min: 50, max: 79 },
    prompts: [
      'How do I know when to use a semicolon vs a comma?',
      'What are the rules for using dashes and parentheses?',
    ],
    emoji: '📝',
    color: 'green',
  },
  {
    conceptId: 'punctuation',
    conceptDisplay: 'Punctuation',
    topic: 'english',
    masteryLevel: 'perfection',
    masteryRange: { min: 80, max: 100 },
    prompts: [
      'Show me the trickiest punctuation questions on the SAT',
      'What are advanced punctuation rules I need to master?',
    ],
    emoji: '📝',
    color: 'green',
  },

  // Word Choice & Meaning
  {
    conceptId: 'word-choice-meaning',
    conceptDisplay: 'Word Choice & Meaning',
    topic: 'english',
    masteryLevel: 'beginner',
    masteryRange: { min: 0, max: 49 },
    prompts: [
      'How do I figure out what a word means from context?',
      'Can you help me understand vocabulary in context questions?',
      'I struggle with word choice questions. Where do I start?',
    ],
    emoji: '📖',
    color: 'purple',
  },
  {
    conceptId: 'word-choice-meaning',
    conceptDisplay: 'Word Choice & Meaning',
    topic: 'english',
    masteryLevel: 'improving',
    masteryRange: { min: 50, max: 79 },
    prompts: [
      'How do I choose between similar words in context?',
      'What strategies help with vocabulary in context questions?',
    ],
    emoji: '📖',
    color: 'purple',
  },
  {
    conceptId: 'word-choice-meaning',
    conceptDisplay: 'Word Choice & Meaning',
    topic: 'english',
    masteryLevel: 'perfection',
    masteryRange: { min: 80, max: 100 },
    prompts: [
      'Show me the most challenging word choice questions from real SATs',
      'What are subtle differences in word meanings I should know?',
    ],
    emoji: '📖',
    color: 'purple',
  },

  // Main Idea & Central Theme
  {
    conceptId: 'main-idea-central-theme',
    conceptDisplay: 'Main Idea & Central Theme',
    topic: 'english',
    masteryLevel: 'beginner',
    masteryRange: { min: 0, max: 49 },
    prompts: [
      'How do I find the main idea of a passage?',
      'What\'s the difference between main idea and supporting details?',
      'I have trouble identifying the central theme. Can you help?',
    ],
    emoji: '💡',
    color: 'orange',
  },
  {
    conceptId: 'main-idea-central-theme',
    conceptDisplay: 'Main Idea & Central Theme',
    topic: 'english',
    masteryLevel: 'improving',
    masteryRange: { min: 50, max: 79 },
    prompts: [
      'How do I distinguish between main ideas and author\'s purpose?',
      'What strategies help me identify themes in complex passages?',
    ],
    emoji: '💡',
    color: 'orange',
  },
  {
    conceptId: 'main-idea-central-theme',
    conceptDisplay: 'Main Idea & Central Theme',
    topic: 'english',
    masteryLevel: 'perfection',
    masteryRange: { min: 80, max: 100 },
    prompts: [
      'Show me complex passages where the main idea is subtle',
      'What are advanced techniques for theme identification?',
    ],
    emoji: '💡',
    color: 'orange',
  },

  // Supporting Evidence
  {
    conceptId: 'supporting-evidence',
    conceptDisplay: 'Supporting Evidence',
    topic: 'english',
    masteryLevel: 'beginner',
    masteryRange: { min: 0, max: 49 },
    prompts: [
      'How do I find evidence to support my answer?',
      'What makes good supporting evidence in a passage?',
      'I\'m confused about evidence-based questions',
    ],
    emoji: '🔍',
    color: 'teal',
  },
  {
    conceptId: 'supporting-evidence',
    conceptDisplay: 'Supporting Evidence',
    topic: 'english',
    masteryLevel: 'improving',
    masteryRange: { min: 50, max: 79 },
    prompts: [
      'How do I choose between multiple pieces of evidence?',
      'What strategies help with paired evidence questions?',
    ],
    emoji: '🔍',
    color: 'teal',
  },
  {
    conceptId: 'supporting-evidence',
    conceptDisplay: 'Supporting Evidence',
    topic: 'english',
    masteryLevel: 'perfection',
    masteryRange: { min: 80, max: 100 },
    prompts: [
      'Show me the trickiest evidence-based questions from real SATs',
      'How do I quickly identify the best supporting evidence?',
    ],
    emoji: '🔍',
    color: 'teal',
  },
];

/**
 * Get chat suggestions for a user based on their learning profile
 * Returns up to 8 chats prioritized by mastery level
 */
export function getRecommendedChats(
  learningProfile: Record<string, { mastery: number }>,
  limit: number = 8
): ConceptChat[] {
  const recommendations: ConceptChat[] = [];

  // For each concept in the learning profile, find matching chats
  Object.entries(learningProfile).forEach(([conceptId, data]) => {
    const mastery = data.mastery;
    
    // Find chats for this concept that match the mastery level
    const matchingChats = SAT_CONCEPT_CHATS.filter(
      chat => 
        chat.conceptId === conceptId &&
        mastery >= chat.masteryRange.min &&
        mastery <= chat.masteryRange.max
    );

    recommendations.push(...matchingChats);
  });

  // Prioritize by mastery level (lower mastery = higher priority)
  recommendations.sort((a, b) => {
    const masteryA = learningProfile[a.conceptId]?.mastery || 50;
    const masteryB = learningProfile[b.conceptId]?.mastery || 50;
    return masteryA - masteryB;
  });

  // Return up to the limit
  return recommendations.slice(0, limit);
}

/**
 * Get a random chat from the available chats
 */
export function getRandomChat(): ConceptChat {
  return SAT_CONCEPT_CHATS[Math.floor(Math.random() * SAT_CONCEPT_CHATS.length)];
}

/**
 * Get chats by mastery level
 */
export function getChatsByMasteryLevel(level: MasteryLevel): ConceptChat[] {
  return SAT_CONCEPT_CHATS.filter(chat => chat.masteryLevel === level);
}

/**
 * Get chats by topic
 */
export function getChatsByTopic(topic: 'math' | 'english'): ConceptChat[] {
  return SAT_CONCEPT_CHATS.filter(chat => chat.topic === topic);
}

/**
 * Get recommended chats prioritizing concepts with recent mistakes
 * @param learningProfile - User's learning profile with mastery levels
 * @param recentMistakeConceptIds - Array of concept IDs where user made recent mistakes
 * @param limit - Maximum number of chats to return (default: 8)
 * @returns Array of recommended chats, prioritizing recent mistakes
 */
export function getRecommendedChatsWithMistakes(
  learningProfile: Record<string, { mastery: number }>,
  recentMistakeConceptIds: string[],
  limit: number = 8
): ConceptChat[] {
  // First, get chats for concepts with recent mistakes
  const mistakeChats: ConceptChat[] = [];
  
  for (const conceptId of recentMistakeConceptIds) {
    const mastery = learningProfile[conceptId]?.mastery || 50;
    const masteryLevel = getMasteryLevelFromScore(mastery);
    
    // Find chats for this concept at the appropriate mastery level
    const conceptChats = SAT_CONCEPT_CHATS.filter(
      chat => chat.conceptId === conceptId && chat.masteryLevel === masteryLevel
    );
    
    if (conceptChats.length > 0) {
      // Pick a random chat for this concept
      mistakeChats.push(conceptChats[Math.floor(Math.random() * conceptChats.length)]);
    }
  }
  
  // If we have enough chats from mistakes, return them
  if (mistakeChats.length >= limit) {
    return mistakeChats.slice(0, limit);
  }
  
  // Otherwise, fill the rest with general recommendations
  const generalRecommendations = getRecommendedChats(learningProfile, limit - mistakeChats.length);
  
  // Combine, ensuring no duplicates
  const seenConceptIds = new Set(mistakeChats.map(c => c.conceptId));
  const additionalChats = generalRecommendations.filter(
    chat => !seenConceptIds.has(chat.conceptId)
  );
  
  return [...mistakeChats, ...additionalChats].slice(0, limit);
}

/**
 * Helper to determine mastery level from score
 */
function getMasteryLevelFromScore(mastery: number): MasteryLevel {
  if (mastery < 50) return 'beginner';
  if (mastery < 80) return 'improving';
  return 'perfection';
}
