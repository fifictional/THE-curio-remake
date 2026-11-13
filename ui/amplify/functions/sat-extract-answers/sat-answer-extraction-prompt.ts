// ==================== PHASE 2: SINGLE MODULE ANSWER EXTRACTION ====================

export const SINGLE_MODULE_ANSWER_EXTRACTION_PROMPT = (moduleNumber: number, moduleName: string, startPage: number, endPage: number, answerCount: number) => `
**CRITICAL: Extract EVERY SINGLE ANSWER from Module ${moduleNumber} (${moduleName}). Do not skip any answers.**

## YOUR TASK:
Extract ALL answers from **Module ${moduleNumber}: ${moduleName}**.

## MODULE INFORMATION:
- Module Number: ${moduleNumber}
- Module Type: ${moduleName}
- Page Range: Pages ${startPage} to ${endPage} of the original answer key
- **REQUIRED Answer Count: EXACTLY ${answerCount} answers** (as stated in answer key header)

## IMPORTANT - PAGE NUMBERING:
**This document contains ONLY Module ${moduleNumber} answers (pages ${startPage}-${endPage} from the original answer key).**

**IMPORTANT: The pages in this PDF are numbered ${startPage}, ${startPage + 1}, ${startPage + 2}, etc. (up to ${endPage})**

- **IGNORE any page numbers that are printed/written ON the pages themselves**
- The first page you see in this document is page ${startPage}
- The second page you see in this document is page ${startPage + 1}
- And so on...

## EXTRACTION RULES:
1. **YOU MUST EXTRACT EXACTLY ${answerCount} ANSWERS** - this is the count shown for this module
2. Answers in this module are numbered from 1 to ${answerCount}
3. Verify you have a continuous sequence: 1, 2, 3, ..., ${answerCount} with NO GAPS

## FOR EACH ANSWER IN THIS MODULE, EXTRACT:

1. **Question Number**: The question number within this module (1, 2, 3, ..., ${answerCount})
2. **Correct Answer**: 
   - For multiple choice: A, B, C, or D (uppercase)
   - For text input: the full answer text (use LaTeX for formulas in style \\(f(x) = x^2\\). All backslashes must be doubled)
3. **Answer Explanations**: Array of 4 strings, one for each option A, B, C, D **IN THAT ORDER**
   - **CRITICAL ORDERING**: The array MUST be in order [A, B, C, D], NOT the order they appear in the document
   - Position 0 = explanation for choice A
   - Position 1 = explanation for choice B
   - Position 2 = explanation for choice C
   - Position 3 = explanation for choice D
   - **REMOVE prefixes**: If an explanation starts with "Choice X is correct/incorrect/wrong" or similar, remove that prefix
   - **DO NOT SUMMARIZE OR PARAPHRASE**: Extract the explanation text verbatim as written in the source. Preserve the original wording, capitalization, punctuation, and mathematical content. Only remove the prefixes described above
   - **Use LaTeX for formulas** in style \\(f(x) = x^2\\). All backslashes must be doubled
   - **Use MARKDOWN for formatting only when present in the original**; do not add stylistic formatting that isn't in the source
   - **Format passages in blockquotes**: Use > for quote formatting
   - If explanations are not available, use empty strings
4. **Hint**: A hint for solving the question (empty string if not available)
   - **Use LaTeX for formulas** in style \\(f(x) = x^2\\). All backslashes must be doubled
   - **Use MARKDOWN for formatting**: *italic*, **bold**, <u>underline</u>

## EXAMPLE OF EXPLANATION ORDERING:

If the document says:
"Choice B is correct because it properly identifies the main theme.
Choice A is incorrect because it focuses on a minor detail.
Choice C is incorrect because it misinterprets the passage.
Choice D is incorrect because it contradicts the evidence."

And the correct answer is B, you should extract:
- correctAnswer: "B"
- answerExplanations: [
    "it focuses on a minor detail.",           // Position 0 = Choice A
    "it properly identifies the main theme.",  // Position 1 = Choice B (correct answer)
    "it misinterprets the passage.",           // Position 2 = Choice C
    "it contradicts the evidence."             // Position 3 = Choice D
  ]

## IMPORTANT RULES:
- Extract answers for questions numbered 1 to ${answerCount}
- For multiple choice answers, use uppercase letters: A, B, C, or D
- If explanations or hints are not in the document, use empty strings
- **CRITICAL ORDERING**: Answer explanations array MUST be ordered [A, B, C, D], regardless of document order
- Ensure explanations array has exactly 4 items (one for each choice)
- **REMOVE PREFIXES**: Strip "Choice X is correct/incorrect/wrong because" from all explanations
 - **NO SUMMARIZATION**: Do not summarize, condense, or rewrite explanations. Copy them verbatim from the source (after removing prefixes)
- **Use LaTeX for mathematical formulas**:
  - Use \\( \\) for inline math, e.g., \\(f(x) = x^2\\)
  - Do NOT use "$" for LaTeX, use \\( \\) instead
  - ALL backslashes must be doubled (e.g., \\\\frac{1}{2})
- **Use MARKDOWN for text formatting**:
  - *italic* for emphasis
  - **bold** for strong emphasis
  - <u>underline</u> for underlined text
  - Use > for blockquotes (passages)
- **CRITICAL: Use standard ASCII quotes and apostrophes**:
  - Replace all smart/curly quotes (" " ' ') with standard straight quotes (" ')
  - Replace all special apostrophes with standard apostrophe (')
  - Replace all em-dashes (—) and en-dashes (–) with standard hyphens (-)

## BEFORE SUBMITTING:
- **CRITICAL**: Count your extracted answers - you MUST have EXACTLY ${answerCount} answers
- Verify answers are numbered sequentially: 1, 2, 3, ..., ${answerCount} with NO GAPS
- If you have fewer than ${answerCount} answers, GO BACK and find the missing ones

Use the 'extractAnswersFromModule' tool to return the data.
`;


export interface ExtractedAnswerFromModule {
  questionNumber: number;
  correctAnswer: string;
  answerExplanations: string[]; // Array of 4 strings (A, B, C, D order), empty strings if not available
  hint: string; // Empty string if not available
}

