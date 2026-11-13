import { type AssessmentQuestion } from './sat-assessment-questions';

// Re-export for convenience
export type { AssessmentQuestion } from './sat-assessment-questions';

/**
 * Comprehensive SAT USA Assessment Question Bank
 * Organized by topic (10 groups) with 3 difficulty levels each (easy, medium, hard)
 * Total: 31 questions
 * 
 * Distribution for 12-question assessment:
 * - Modules 1-2: 3 RW (2 easy, 1 medium) + 3 Math (2 easy, 1 medium) = 6 questions
 * - Easy-Medium path: 3 RW (1 easy, 2 medium) + 3 Math (1 easy, 2 medium) = 6 questions
 * - Medium-Hard path: 3 RW (2 medium, 1 hard) + 3 Math (2 medium, 1 hard) = 6 questions
 * Total: 4 easy + 6 medium + 2 hard = 12 questions
 * 
 * Medium questions: 6 Math + 5 R&W = 11 total (ensures variety in question selection)
 */

export const SAT_QUESTION_BANK: AssessmentQuestion[] = [
  // ========== 1. LINEAR EQUATIONS (Algebraic Reasoning) ==========
  {
    id: 'linear-equations-easy-1',
    topic: 'Math',
    subtopic: 'Linear Equations',
    concept: 'linear-equations',
    difficulty: 'easy',
    questionContent: 'If \\(3x = 15\\), what is the value of \\(x\\)?',
    options: ['3', '5', '12', '18'],
    answer: 1,
    answerExplanations: [
      'Incorrect. This would be the answer if \\(x = 3\\), but \\(3 \\times 3 = 9\\), not 15.',
      'Correct! Divide both sides by 3: \\(x = 15 \\div 3 = 5\\).',
      'Incorrect. This is \\(15 - 3\\), but you need to divide, not subtract.',
      'Incorrect. This is \\(15 + 3\\), but you need to divide by 3.'
    ],
    hint: 'To isolate \\(x\\), divide both sides of the equation by 3.'
  },
  {
    id: 'linear-equations-medium-1',
    topic: 'Math',
    subtopic: 'Linear Equations',
    concept: 'linear-equations',
    difficulty: 'medium',
    questionContent: 'If \\(2(x + 3) = 14\\), what is the value of \\(x\\)?',
    options: ['1', '4', '7', '11'],
    answer: 1,
    answerExplanations: [
      'Incorrect. This would give \\(2(1 + 3) = 8\\), not 14.',
      'Correct! First divide both sides by 2: \\(x + 3 = 7\\). Then subtract 3: \\(x = 4\\).',
      'Incorrect. This is \\(14 \\div 2\\), but you still need to subtract 3.',
      'Incorrect. This is \\(14 - 3\\), but you need to divide by 2 first.'
    ],
    hint: 'First distribute or divide by 2, then isolate \\(x\\).'
  },
  {
    id: 'systems-equations-hard-1',
    topic: 'Math',
    subtopic: 'Systems of Equations',
    concept: 'systems-of-equations',
    difficulty: 'hard',
    questionContent: 'If \\(\\frac{x + 2}{3} = 5\\), what is the value of \\(2x - 1\\)?',
    options: ['12', '13', '25', '26'],
    answer: 2,
    answerExplanations: [
      'Incorrect. You may have found \\(x = 13\\) but didn\'t calculate \\(2x - 1\\) correctly.',
      'Incorrect. This is the value of \\(x\\), not \\(2x - 1\\).',
      'Correct! First solve for \\(x\\): multiply both sides by 3 to get \\(x + 2 = 15\\), so \\(x = 13\\). Then \\(2(13) - 1 = 26 - 1 = 25\\).',
      'Incorrect. This is \\(2x\\), but you forgot to subtract 1.'
    ],
    hint: 'First solve for \\(x\\), then substitute into \\(2x - 1\\).'
  },

  // ========== 2. QUADRATIC EQUATIONS (Advanced Math) ==========
  {
    id: 'quadratic-equations-easy-1',
    topic: 'Math',
    subtopic: 'Quadratic Equations',
    concept: 'quadratic-equations',
    difficulty: 'easy',
    questionContent: 'What is the value of \\(5^2 - 3^2\\)?',
    options: ['4', '8', '16', '34'],
    answer: 2,
    answerExplanations: [
      'Incorrect. This is \\(5 - 3 = 2\\) squared, not \\(5^2 - 3^2\\).',
      'Incorrect. This is \\(5 + 3\\), not \\(5^2 - 3^2\\).',
      'Correct! \\(5^2 = 25\\) and \\(3^2 = 9\\), so \\(25 - 9 = 16\\).',
      'Incorrect. This is \\(5^2 + 3^2\\), not the difference.'
    ],
    hint: 'Calculate each square first, then subtract.'
  },
  {
    id: 'functions-medium-1',
    topic: 'Math',
    subtopic: 'Functions',
    concept: 'functions',
    difficulty: 'medium',
    questionContent: 'If \\(f(x) = x^2 - 4x + 3\\), what is the value of \\(f(5)\\)?',
    options: ['3', '8', '12', '28'],
    answer: 1,
    answerExplanations: [
      'Incorrect. This is \\(f(0)\\), not \\(f(5)\\).',
      'Correct! Substitute \\(x = 5\\): \\(f(5) = 5^2 - 4(5) + 3 = 25 - 20 + 3 = 8\\).',
      'Incorrect. You may have made an error with the signs or order of operations.',
      'Incorrect. This is \\(5^2 + 3\\), but you forgot to subtract \\(4(5)\\).'
    ],
    hint: 'Substitute 5 for \\(x\\) in the function and follow order of operations carefully.'
  },
  {
    id: 'quadratic-equations-hard-1',
    topic: 'Math',
    subtopic: 'Quadratic Equations',
    concept: 'quadratic-equations',
    difficulty: 'hard',
    questionContent: 'What are the solutions to \\(x^2 - 6x + 8 = 0\\)?',
    options: ['\\(x = 1\\) and \\(x = 8\\)', '\\(x = 2\\) and \\(x = 4\\)', '\\(x = -2\\) and \\(x = -4\\)', '\\(x = 3\\) and \\(x = 5\\)'],
    answer: 1,
    answerExplanations: [
      'Incorrect. These values don\'t satisfy the equation when substituted.',
      'Correct! Factor as \\((x - 2)(x - 4) = 0\\), so \\(x = 2\\) or \\(x = 4\\). Check: \\(2^2 - 6(2) + 8 = 4 - 12 + 8 = 0\\) ✓',
      'Incorrect. These are negative versions of the correct answers.',
      'Incorrect. These values don\'t satisfy the equation.'
    ],
    hint: 'Try factoring the quadratic into two binomials, or use the quadratic formula.'
  },

  // ========== 3. CIRCLES & POLYGONS (Geometry / Trigonometry) ==========
  {
    id: 'circles-polygons-easy-1',
    topic: 'Math',
    subtopic: 'Circles & Polygons',
    concept: 'circles-polygons',
    difficulty: 'easy',
    questionContent: 'A rectangle has a length of 10 inches and a width of 6 inches. What is its area in square inches?',
    options: ['16', '32', '60', '120'],
    answer: 2,
    answerExplanations: [
      'Incorrect. This is \\(10 + 6\\), but area requires multiplication.',
      'Incorrect. This is the perimeter, not the area.',
      'Correct! Area of a rectangle = length × width = \\(10 \\times 6 = 60\\) square inches.',
      'Incorrect. You may have doubled the area by mistake.'
    ],
    hint: 'Area of a rectangle equals length times width.'
  },
  {
    id: 'circles-polygons-medium-1',
    topic: 'Math',
    subtopic: 'Circles & Polygons',
    concept: 'circles-polygons',
    difficulty: 'medium',
    questionContent: 'A circle has a diameter of 12 units. What is its area? (Use \\(\\pi \\approx 3.14\\))',
    options: ['37.68', '75.36', '113.04', '452.16'],
    answer: 2,
    answerExplanations: [
      'Incorrect. This is \\(\\pi r\\), but you need \\(\\pi r^2\\).',
      'Incorrect. This is \\(2\\pi r\\), which is the circumference.',
      'Correct! Radius = \\(12 \\div 2 = 6\\). Area = \\(\\pi r^2 = 3.14 \\times 6^2 = 3.14 \\times 36 = 113.04\\).',
      'Incorrect. You may have used the diameter instead of the radius in the formula.'
    ],
    hint: 'First find the radius (half the diameter), then use \\(A = \\pi r^2\\).'
  },
  {
    id: 'coordinate-geometry-hard-1',
    topic: 'Math',
    subtopic: 'Coordinate Geometry',
    concept: 'coordinate-geometry',
    difficulty: 'hard',
    questionContent: 'In the \\(xy\\)-plane, a line passes through points \\((2, 5)\\) and \\((6, 13)\\). What is the slope of this line?',
    options: ['\\(\\frac{1}{2}\\)', '2', '4', '8'],
    answer: 1,
    answerExplanations: [
      'Incorrect. You may have inverted the slope formula.',
      'Correct! Slope = \\(\\frac{y_2 - y_1}{x_2 - x_1} = \\frac{13 - 5}{6 - 2} = \\frac{8}{4} = 2\\).',
      'Incorrect. This is \\(6 - 2\\), the difference in \\(x\\)-values only.',
      'Incorrect. This is \\(13 - 5\\), the difference in \\(y\\)-values only.'
    ],
    hint: 'Use the slope formula: \\(m = \\frac{\\text{change in } y}{\\text{change in } x}\\).'
  },

  // ========== 4. STATISTICS & PROBABILITY (Data Interpretation) ==========
  {
    id: 'statistics-probability-easy-1',
    topic: 'Math',
    subtopic: 'Statistics & Probability',
    concept: 'statistics-probability',
    difficulty: 'easy',
    questionContent: 'What is the median of the following set of numbers: 3, 7, 5, 9, 11?',
    options: ['5', '7', '9', '11'],
    answer: 1,
    answerExplanations: [
      'Incorrect. This is the second number in the ordered list, not the middle.',
      'Correct! First order the numbers: 3, 5, 7, 9, 11. The median is the middle value: 7.',
      'Incorrect. This is the fourth number, not the middle.',
      'Incorrect. This is the maximum value, not the median.'
    ],
    hint: 'First arrange the numbers in order from smallest to largest, then find the middle value.'
  },
  {
    id: 'statistics-probability-medium-1',
    topic: 'Math',
    subtopic: 'Statistics & Probability',
    concept: 'statistics-probability',
    difficulty: 'medium',
    questionContent: 'The mean of five test scores is 84. If four of the scores are 78, 82, 88, and 90, what is the fifth score?',
    options: ['80', '82', '84', '86'],
    answer: 1,
    answerExplanations: [
      'Incorrect. This would give a mean less than 84.',
      'Correct! Total sum needed = \\(5 \\times 84 = 420\\). Sum of four scores = \\(78 + 82 + 88 + 90 = 338\\). Fifth score = \\(420 - 338 = 82\\).',
      'Incorrect. This is the mean, not the missing score.',
      'Incorrect. This would give a mean greater than 84.'
    ],
    hint: 'Find the total sum needed for a mean of 84, then subtract the four known scores.'
  },
  {
    id: 'data-analysis-hard-1',
    topic: 'Math',
    subtopic: 'Data Analysis',
    concept: 'data-analysis',
    difficulty: 'hard',
    questionContent: 'A survey of 200 students found that 120 play sports and 80 play a musical instrument. If 50 students do both, how many students do neither?',
    options: ['30', '50', '70', '150'],
    answer: 1,
    answerExplanations: [
      'Incorrect. This doesn\'t account for the overlap correctly.',
      'Correct! Students doing at least one = \\(120 + 80 - 50 = 150\\). Students doing neither = \\(200 - 150 = 50\\).',
      'Incorrect. You may have subtracted the overlap twice.',
      'Incorrect. This is the number who do at least one activity, not neither.'
    ],
    hint: 'Use the principle: Total = (Sports only) + (Music only) + (Both) + (Neither). Remember to subtract the overlap.'
  },

  // ========== 5. EXPONENTS & RADICALS (Advanced Math) ==========
  {
    id: 'exponents-radicals-easy-1',
    topic: 'Math',
    subtopic: 'Exponents, Radicals & Rational Powers',
    concept: 'exponents-radicals-rational-powers',
    difficulty: 'easy',
    questionContent: 'What is \\(2^3 \\times 2^2\\)?',
    options: ['16', '32', '64', '128'],
    answer: 1,
    answerExplanations: [
      'Incorrect. This is \\(2^4\\), not \\(2^5\\).',
      'Correct! When multiplying powers with the same base, add the exponents: \\(2^3 \\times 2^2 = 2^{3+2} = 2^5 = 32\\).',
      'Incorrect. This is \\(2^6\\).',
      'Incorrect. This is \\(2^7\\).'
    ],
    hint: 'When multiplying powers with the same base, add the exponents.'
  },
  {
    id: 'exponents-radicals-medium-1',
    topic: 'Math',
    subtopic: 'Exponents, Radicals & Rational Powers',
    concept: 'exponents-radicals-rational-powers',
    difficulty: 'medium',
    questionContent: 'If \\(\\sqrt{x + 5} = 4\\), what is the value of \\(x\\)?',
    options: ['9', '11', '16', '21'],
    answer: 1,
    answerExplanations: [
      'Incorrect. You may have subtracted 5 from 4 instead of squaring first.',
      'Correct! Square both sides: \\((\\sqrt{x + 5})^2 = 4^2\\), so \\(x + 5 = 16\\). Then \\(x = 16 - 5 = 11\\).',
      'Incorrect. This is \\(4^2\\), but you forgot to subtract 5.',
      'Incorrect. You may have added 5 to 16 instead of subtracting.'
    ],
    hint: 'Square both sides of the equation to eliminate the square root, then solve for \\(x\\).'
  },
  {
    id: 'exponents-radicals-hard-1',
    topic: 'Math',
    subtopic: 'Exponents, Radicals & Rational Powers',
    concept: 'exponents-radicals-rational-powers',
    difficulty: 'hard',
    questionContent: 'Simplify: \\(\\frac{8^4}{8^2}\\)',
    options: ['8', '16', '64', '512'],
    answer: 2,
    answerExplanations: [
      'Incorrect. This is \\(8^1\\), but you need to subtract exponents: \\(4 - 2 = 2\\).',
      'Incorrect. This is \\(2^4\\), not \\(8^2\\).',
      'Correct! When dividing powers with the same base, subtract the exponents: \\(\\frac{8^4}{8^2} = 8^{4-2} = 8^2 = 64\\).',
      'Incorrect. This is \\(8^3\\).'
    ],
    hint: 'When dividing powers with the same base, subtract the exponents.'
  },

  // ========== 6. RATIOS & PROPORTIONS (Data Interpretation) ==========
  {
    id: 'ratios-proportions-easy-1',
    topic: 'Math',
    subtopic: 'Ratios & Proportions',
    concept: 'ratios-proportions',
    difficulty: 'easy',
    questionContent: 'What is 20% of 150?',
    options: ['20', '30', '50', '70'],
    answer: 1,
    answerExplanations: [
      'Incorrect. This is the percentage value, not 20% of 150.',
      'Correct! \\(20\\% = 0.20\\), so \\(0.20 \\times 150 = 30\\).',
      'Incorrect. This is about 33% of 150.',
      'Incorrect. This is about 47% of 150.'
    ],
    hint: 'Convert the percentage to a decimal and multiply: \\(0.20 \\times 150\\).'
  },
  {
    id: 'ratios-proportions-medium-1',
    topic: 'Math',
    subtopic: 'Ratios & Proportions',
    concept: 'ratios-proportions',
    difficulty: 'medium',
    questionContent: 'A store marks up the wholesale price of an item by 40% to get the retail price. If the wholesale price is $50, what is the retail price?',
    options: ['$60', '$65', '$70', '$90'],
    answer: 2,
    answerExplanations: [
      'Incorrect. This is only a 20% markup.',
      'Incorrect. This is a 30% markup.',
      'Correct! Markup amount = \\(50 \\times 0.40 = 20\\). Retail price = \\(50 + 20 = 70\\).',
      'Incorrect. This is an 80% markup.'
    ],
    hint: 'Calculate 40% of the wholesale price, then add it to the original price.'
  },
  {
    id: 'ratios-proportions-hard-1',
    topic: 'Math',
    subtopic: 'Ratios & Proportions',
    concept: 'ratios-proportions',
    difficulty: 'hard',
    questionContent: 'The ratio of red marbles to blue marbles in a jar is 2:3. If there are 15 blue marbles, how many total marbles are in the jar?',
    options: ['10', '15', '25', '30'],
    answer: 2,
    answerExplanations: [
      'Incorrect. This is the number of red marbles only.',
      'Incorrect. This is the number of blue marbles only.',
      'Correct! If the ratio is 2:3 and there are 15 blue marbles, then red marbles = \\(\\frac{2}{3} \\times 15 = 10\\). Total = \\(10 + 15 = 25\\).',
      'Incorrect. You may have multiplied 15 by 2 instead of using the ratio.'
    ],
    hint: 'Use the ratio to find the number of red marbles, then add both colors together.'
  },

  // ========== 6. GRAMMAR & USAGE (Standard English Conventions) ==========
  {
    id: 'grammar-usage-easy-1',
    topic: 'Reading & Writing',
    subtopic: 'Grammar & Usage',
    concept: 'grammar-usage',
    difficulty: 'easy',
    questionContent: 'Which sentence is grammatically correct?',
    options: [
      'She don\'t like pizza.',
      'She doesn\'t like pizza.',
      'She don\'t likes pizza.',
      'She doesn\'t likes pizza.'
    ],
    answer: 1,
    answerExplanations: [
      'Incorrect. "Don\'t" is used with plural subjects or "I/you," not with "she."',
      'Correct! "Doesn\'t" is the correct contraction for "does not" with the third-person singular subject "she."',
      'Incorrect. This combines two errors: wrong auxiliary verb and wrong verb form.',
      'Incorrect. When using "doesn\'t," the main verb should be in base form, not "likes."'
    ],
    hint: 'With third-person singular subjects (he, she, it), use "doesn\'t" not "don\'t."'
  },
  {
    id: 'punctuation-medium-1',
    topic: 'Reading & Writing',
    subtopic: 'Punctuation',
    concept: 'punctuation',
    difficulty: 'medium',
    questionContent: 'Which sentence correctly uses a comma?',
    options: [
      'After finishing her homework Sarah went to bed.',
      'After finishing her homework, Sarah went to bed.',
      'After, finishing her homework Sarah went to bed.',
      'After finishing her homework Sarah, went to bed.'
    ],
    answer: 1,
    answerExplanations: [
      'Incorrect. An introductory phrase needs a comma after it.',
      'Correct! When an introductory phrase begins a sentence, place a comma after it before the main clause.',
      'Incorrect. The comma should come after the entire introductory phrase, not within it.',
      'Incorrect. The comma should come after the introductory phrase, not before the verb.'
    ],
    hint: 'Introductory phrases at the beginning of a sentence should be followed by a comma.'
  },
  {
    id: 'sentence-structure-hard-1',
    topic: 'Reading & Writing',
    subtopic: 'Sentence Structure',
    concept: 'sentence-structure',
    difficulty: 'hard',
    questionContent: 'Which sentence uses a semicolon correctly?',
    options: [
      'The concert was amazing; and the crowd loved it.',
      'The concert was amazing; the crowd loved it.',
      'The concert was amazing; because the crowd loved it.',
      'The concert; was amazing and the crowd loved it.'
    ],
    answer: 1,
    answerExplanations: [
      'Incorrect. Don\'t use a semicolon before a coordinating conjunction like "and."',
      'Correct! A semicolon correctly joins two independent clauses that are closely related.',
      'Incorrect. Don\'t use a semicolon before a subordinating conjunction like "because."',
      'Incorrect. A semicolon should separate two complete clauses, not split a subject from its verb.'
    ],
    hint: 'Semicolons join two independent clauses without a conjunction.'
  },

  // ========== 7. WORD CHOICE & MEANING (Reading Craft & Structure) ==========
  {
    id: 'word-choice-meaning-easy-1',
    topic: 'Reading & Writing',
    subtopic: 'Word Choice & Meaning',
    concept: 'word-choice-meaning',
    difficulty: 'easy',
    questionContent: 'In the sentence "The teacher asked the students to **elaborate** on their answers," the word "elaborate" most nearly means:',
    options: ['shorten', 'explain in more detail', 'memorize', 'erase'],
    answer: 1,
    answerExplanations: [
      'Incorrect. This is the opposite of elaborate.',
      'Correct! "Elaborate" means to add more details or information.',
      'Incorrect. Memorizing is about remembering, not adding detail.',
      'Incorrect. Erasing removes content rather than adding to it.'
    ],
    hint: 'Think about what a teacher wants when asking for more information about an answer.'
  },
  {
    id: 'word-choice-meaning-medium-1',
    topic: 'Reading & Writing',
    subtopic: 'Word Choice & Meaning',
    concept: 'word-choice-meaning',
    difficulty: 'medium',
    questionContent: 'Which word best completes the sentence? "The scientist\'s theory was **____** by years of experimental data."',
    options: ['contradicted', 'corroborated', 'ignored', 'questioned'],
    answer: 1,
    answerExplanations: [
      'Incorrect. This would mean the data opposed the theory.',
      'Correct! "Corroborated" means supported or confirmed by evidence.',
      'Incorrect. This would mean the data was not considered.',
      'Incorrect. This suggests doubt rather than support.'
    ],
    hint: 'Think about what experimental data typically does for a scientific theory.'
  },
  {
    id: 'style-precision-hard-1',
    topic: 'Reading & Writing',
    subtopic: 'Style & Precision',
    concept: 'style-precision',
    difficulty: 'hard',
    questionContent: 'Which revision best improves the sentence for clarity and conciseness? "Due to the fact that it was raining, the game was postponed."',
    options: [
      'Due to the fact that rain was occurring, the game was postponed.',
      'Because it was raining, the game was postponed.',
      'It being rainy, the game was postponed.',
      'The game was postponed due to the fact of rain.'
    ],
    answer: 1,
    answerExplanations: [
      'Incorrect. This is even wordier than the original.',
      'Correct! "Because" is more concise than "due to the fact that" and maintains the same meaning.',
      'Incorrect. This creates an awkward construction.',
      'Incorrect. This is still wordy and grammatically awkward.'
    ],
    hint: 'Look for the simplest, most direct way to express the cause-and-effect relationship.'
  },

  // ========== 8. MAIN IDEA & CENTRAL THEME (Information & Ideas) ==========
  {
    id: 'main-idea-central-theme-easy-1',
    topic: 'Reading & Writing',
    subtopic: 'Main Idea & Central Theme',
    concept: 'main-idea-central-theme',
    difficulty: 'easy',
    questionContent: '**Passage:** "Maria has been practicing piano for five years. She practices every day for at least one hour. Her dedication has helped her win several competitions."\n\nHow long has Maria been practicing piano?',
    options: ['One hour', 'One year', 'Five years', 'Several years'],
    answer: 2,
    answerExplanations: [
      'Incorrect. This is how long she practices each day, not the total time.',
      'Incorrect. The passage states she has been practicing for more than one year.',
      'Correct! The passage explicitly states "Maria has been practicing piano for five years."',
      'Incorrect. While "several" could apply to competitions, the passage gives a specific number of years.'
    ],
    hint: 'Look for the phrase that tells you the total duration of her practice.'
  },
  {
    id: 'main-idea-central-theme-medium-1',
    topic: 'Reading & Writing',
    subtopic: 'Main Idea & Central Theme',
    concept: 'main-idea-central-theme',
    difficulty: 'medium',
    questionContent: '**Passage:** "While social media has connected people across the globe, researchers have found that excessive use may lead to decreased face-to-face interactions and increased feelings of loneliness. The key, experts suggest, is finding a healthy balance."\n\nWhat is the main idea of this passage?',
    options: [
      'Social media should be completely avoided.',
      'Social media only has negative effects.',
      'Social media has both benefits and drawbacks, requiring balanced use.',
      'Face-to-face interactions are impossible with social media.'
    ],
    answer: 2,
    answerExplanations: [
      'Incorrect. The passage acknowledges benefits and suggests balance, not complete avoidance.',
      'Incorrect. The passage mentions the positive aspect of connecting people globally.',
      'Correct! The passage presents both the benefit (global connection) and drawbacks (loneliness), concluding that balance is key.',
      'Incorrect. The passage says interactions may decrease, not that they\'re impossible.'
    ],
    hint: 'Notice the word "while" at the beginning, which introduces contrasting ideas.'
  },
  {
    id: 'text-structure-hard-1',
    topic: 'Reading & Writing',
    subtopic: 'Text Structure',
    concept: 'text-structure',
    difficulty: 'hard',
    questionContent: '**Passage:** "The Renaissance, spanning the 14th to 17th centuries, marked a profound transformation in European thought. Artists and scholars looked back to classical Greek and Roman texts, not merely to copy them, but to reinterpret ancient wisdom through a contemporary lens. This fusion of old and new gave birth to revolutionary advances in art, science, and philosophy."\n\nWhich statement best describes the Renaissance approach to classical texts?',
    options: [
      'Renaissance thinkers rejected classical texts entirely.',
      'Renaissance thinkers copied classical texts exactly.',
      'Renaissance thinkers reinterpreted classical wisdom for their own time.',
      'Renaissance thinkers ignored the meaning of classical texts.'
    ],
    answer: 2,
    answerExplanations: [
      'Incorrect. The passage says they "looked back to" classical texts, not rejected them.',
      'Incorrect. The passage explicitly states they did "not merely copy them."',
      'Correct! The passage states they sought to "reinterpret ancient wisdom through a contemporary lens," creating a "fusion of old and new."',
      'Incorrect. The passage emphasizes engagement with classical wisdom, not ignoring it.'
    ],
    hint: 'Pay attention to the phrase "not merely to copy them, but to..."'
  },

  // ========== 9. SUPPORTING EVIDENCE (Information & Ideas) ==========
  {
    id: 'supporting-evidence-easy-1',
    topic: 'Reading & Writing',
    subtopic: 'Supporting Evidence',
    concept: 'supporting-evidence',
    difficulty: 'easy',
    questionContent: '**Claim:** "Reading books improves vocabulary."\n\nWhich statement provides the best evidence for this claim?',
    options: [
      'Books are available at libraries.',
      'Many people enjoy reading.',
      'Studies show that frequent readers have larger vocabularies than non-readers.',
      'Books come in different genres.'
    ],
    answer: 2,
    answerExplanations: [
      'Incorrect. Availability doesn\'t prove that reading improves vocabulary.',
      'Incorrect. Enjoyment doesn\'t demonstrate vocabulary improvement.',
      'Correct! This provides research-based evidence directly linking reading to vocabulary size.',
      'Incorrect. Genre variety doesn\'t prove vocabulary improvement.'
    ],
    hint: 'Look for evidence that directly connects reading to vocabulary improvement.'
  },
  {
    id: 'supporting-evidence-medium-1',
    topic: 'Reading & Writing',
    subtopic: 'Supporting Evidence',
    concept: 'supporting-evidence',
    difficulty: 'medium',
    questionContent: '**Argument:** "Schools should require students to learn a foreign language. Research indicates that bilingual individuals show enhanced cognitive flexibility and problem-solving skills compared to monolinguals."\n\nWhat makes this argument effective?',
    options: [
      'It appeals only to emotion.',
      'It provides research-based evidence to support the claim.',
      'It relies on personal opinion.',
      'It doesn\'t explain why language learning matters.'
    ],
    answer: 1,
    answerExplanations: [
      'Incorrect. While there may be some appeal to values, the argument primarily uses research evidence.',
      'Correct! The argument cites research findings about cognitive benefits, providing concrete evidence for the policy recommendation.',
      'Incorrect. The argument is based on research, not just personal opinion.',
      'Incorrect. The argument clearly explains benefits: enhanced cognitive flexibility and problem-solving.'
    ],
    hint: 'Notice the phrase "research indicates" and what follows.'
  },
  {
    id: 'organization-logical-flow-medium-1',
    topic: 'Reading & Writing',
    subtopic: 'Organization & Logical Flow',
    concept: 'organization-logical-flow',
    difficulty: 'medium',
    questionContent: '**Draft:** "[1] The library will be closed next week for renovations. [2] New carpeting and paint will be applied. [3] The library has served the community for 50 years. [4] Books can still be returned through the drop box."\n\nWhich sentence should be removed to improve the logical flow?',
    options: ['Sentence 1', 'Sentence 2', 'Sentence 3', 'Sentence 4'],
    answer: 2,
    answerExplanations: [
      'Incorrect. This sentence introduces the main topic (library closure) and is essential.',
      'Incorrect. This sentence explains what renovations will occur, supporting sentence 1.',
      'Correct! Sentence 3 about the library\'s history interrupts the logical flow about the closure and renovation details. It doesn\'t fit with the other sentences about the temporary closure.',
      'Incorrect. This sentence provides practical information related to the closure.'
    ],
    hint: 'Look for the sentence that doesn\'t relate to the closure and renovation.'
  },
  {
    id: 'organization-logical-flow-hard-1',
    topic: 'Reading & Writing',
    subtopic: 'Organization & Logical Flow',
    concept: 'organization-logical-flow',
    difficulty: 'hard',
    questionContent: '**Argument:** "Everyone I know who drinks coffee stays awake late at night. Therefore, coffee must cause insomnia in all people."\n\nWhat logical flaw does this argument contain?',
    options: [
      'False dichotomy',
      'Circular reasoning',
      'Hasty generalization',
      'Ad hominem attack'
    ],
    answer: 2,
    answerExplanations: [
      'Incorrect. False dichotomy presents only two options; this argument doesn\'t do that.',
      'Incorrect. Circular reasoning uses the conclusion as evidence; this argument doesn\'t.',
      'Correct! The argument draws a broad conclusion about "all people" based on limited personal experience ("everyone I know"), which is a hasty generalization.',
      'Incorrect. Ad hominem attacks a person; this argument makes a claim about coffee\'s effects.'
    ],
    hint: 'Consider whether personal experience with a few people justifies a conclusion about everyone.'
  },
];

// Helper function to get questions by difficulty
export function getQuestionsByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): AssessmentQuestion[] {
  return SAT_QUESTION_BANK.filter(q => q.difficulty === difficulty);
}

// Helper function to get questions by topic
export function getQuestionsByTopic(topic: string): AssessmentQuestion[] {
  return SAT_QUESTION_BANK.filter(q => q.topic === topic);
}

// Helper function to get questions by subtopic
export function getQuestionsBySubtopic(subtopic: string): AssessmentQuestion[] {
  return SAT_QUESTION_BANK.filter(q => q.subtopic === subtopic);
}
