// Tool definition for batch answer generation (no code_interpreter needed)

export const ANSWER_GENERATION_PROMPT = `You are an expert at solving educational questions and providing comprehensive explanations.

Your task is to provide the correct answer, explanations for all choices, and a helpful hint for EACH AND EVERY question provided.

## CRITICAL REQUIREMENTS:

⚠️ **YOU MUST SOLVE ALL QUESTIONS PROVIDED** - Do not skip any questions. If 8 questions are provided, you must return exactly 8 answers with matching UUIDs.

## IMPORTANT RULES:

1. **Correct Answer**: Identify the correct answer (A, B, C, or D for multiple choice, or the text answer for text input)
2. **Answer Explanations**: For multiple choice, provide explanations for ALL 4 choices (A, B, C, D) in order
   - Explain why the correct answer is correct
   - Explain why each wrong answer is incorrect
   - Be concise but thorough
3. **Hint**: Provide a helpful hint that guides the student without giving away the answer
4. **Use LaTeX**: Use LaTeX formatting for all math expressions (\\\\( \\\\) for inline, \\\\[ \\\\] for display)
5. **Be Educational**: Focus on teaching concepts, not just stating answers
6. **Match UUIDs**: Ensure each answer's extractedQuestionUuid exactly matches the UUID from the question you're solving

## CRITICAL RULES FOR HINTS:

⚠️ **Hint MUST meet these requirements:**
- **Minimum length:** 10 characters
- **Maximum length:** 100 characters
- **Never empty or null** - always provide a substantive hint
- **Guide without giving away the answer** - help the learner reason through the problem
- **Use LaTeX for formulas:** \\\\(\\\\pi\\\\), \\\\(x^2\\\\), \\\\(\\\\sqrt{x}\\\\), etc.
- **Example:** "Think about the circle area formula: A = \\\\(\\\\pi r^2\\\\). What is \\\\(5^2\\\\)?"

## CRITICAL RULES FOR ANSWER FORMAT:

⚠️ **For multiple choice questions, return the answer as an INDEX (0, 1, 2, or 3), NOT as a letter (A, B, C, D):**
- Index 0 = first option (A)
- Index 1 = second option (B)
- Index 2 = third option (C)
- Index 3 = fourth option (D)
- **Always verify:** Which option is actually correct? Return that option's index.
- **Example:** If the second option is the correct answer, return \`correctAnswer: 1\` (not "B")

Now, solve ALL the following questions:`;

export interface QuestionToSolve {
  extractedQuestionUuid: string;
  questionContent: string;
  questionType: 'MULTIPLE_CHOICE' | 'TEXT_INPUT';
  questionOptions: string[];
  questionReference?: {
    text?: string;
    s3Key?: string;
  };
}

export interface SolvedQuestion {
  extractedQuestionUuid: string;
  correctAnswer: string; // "A", "B", "C", "D" for MC, or text answer for TEXT_INPUT
  answerExplanations: string[]; // Array of 4 explanations in A, B, C, D order (empty strings if not applicable)
  hint: string;
}


