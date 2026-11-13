// ==================== SINGLE MODULE EXTRACTION ====================
// Note: Module identification has been moved to sat-extract-modules/module-identification-prompt.ts

interface SATConcept {
  concept: string;
  conceptDisplay: string;
  subtopic: string;
  subtopicDisplay: string;
  topic: string;
  topicDisplay: string;
}

export const SINGLE_MODULE_EXTRACTION_PROMPT = (
  moduleNumber: number, 
  moduleName: string, 
  startPage: number, 
  endPage: number, 
  questionCount: number,
  satConcepts: SATConcept[]
) => {
  // Group concepts by topic and subtopic for better readability
  const conceptsByTopic = satConcepts.reduce((acc, c) => {
    if (!acc[c.topic]) {
      acc[c.topic] = { topicDisplay: c.topicDisplay, subtopics: {} };
    }
    if (!acc[c.topic].subtopics[c.subtopic]) {
      acc[c.topic].subtopics[c.subtopic] = { subtopicDisplay: c.subtopicDisplay, concepts: [] };
    }
    acc[c.topic].subtopics[c.subtopic].concepts.push({
      id: c.concept,
      display: c.conceptDisplay
    });
    return acc;
  }, {} as Record<string, { topicDisplay: string; subtopics: Record<string, { subtopicDisplay: string; concepts: { id: string; display: string }[] }> }>);

  // Format concepts for the prompt
  let conceptsList = '\n## ALLOWED SAT CONCEPTS:\n';
  conceptsList += '**CRITICAL: You MUST use ONLY the concept IDs from this list. Do NOT make up your own concepts.**\n\n';
  
  for (const [topicId, topicData] of Object.entries(conceptsByTopic)) {
    conceptsList += `### ${topicData.topicDisplay} (topic: "${topicId}")\n`;
    for (const [subtopicId, subtopicData] of Object.entries(topicData.subtopics)) {
      conceptsList += `  **${subtopicData.subtopicDisplay}** (subtopic: "${subtopicId}")\n`;
      for (const concept of subtopicData.concepts) {
        conceptsList += `    - **concept id: "${concept.id}"** (concept: "${concept.display}")\n`;
      }
    }
    conceptsList += '\n';
  }

  return `
**CRITICAL: Extract EVERY SINGLE QUESTION from Module ${moduleNumber} (${moduleName}). Do not skip any questions.**

## YOUR TASK:
Extract ALL questions from **Module ${moduleNumber}: ${moduleName}**.

## MODULE INFORMATION:
- Module Number: ${moduleNumber}
- Module Type: ${moduleName}
- Page Range: Pages ${startPage} to ${endPage} of the original exam
- Module Length: ${endPage - startPage + 1} pages
- **REQUIRED Question Count: EXACTLY ${questionCount} questions** (as stated in module header)

${conceptsList}

## CRITICAL - PAGE NUMBERING FOR REFERENCES:
**This document contains ONLY Module ${moduleNumber} (pages ${startPage}-${endPage} from the original exam).**

**IMPORTANT: The pages in this PDF are numbered ${startPage}, ${startPage + 1}, ${startPage + 2}, etc. (up to ${endPage})**

When providing page numbers for question references:
- Use these sequential page numbers: ${startPage}, ${startPage + 1}, ${startPage + 2}, etc.
- **IGNORE any page numbers that are printed/written ON the pages themselves**
- The first page you see in this document is page ${startPage}
- The second page you see in this document is page ${startPage + 1}
- And so on...

## EXTRACTION RULES:
1. **You are seeing ONLY Module ${moduleNumber}** - this is a standalone document
2. Questions in this module are numbered from 1 to ${questionCount}
3. **YOU MUST EXTRACT EXACTLY ${questionCount} QUESTIONS** - this is the count shown at the top of the module
4. Verify you have a continuous sequence: 1, 2, 3, ..., ${questionCount} with NO GAPS

## FOR EACH QUESTION IN THIS MODULE, EXTRACT:

1. **Question Number**: The question number (1, 2, 3, ..., 27) - as shown in the document
2. **Question Content**: The complete question text
   - **Use LaTeX for formulas** in style \\(f(x) = x^2\\). All backslashes must be doubled
   - **Use MARKDOWN for formatting**: *italic*, **bold**, <u>underline</u>
   - **Format passages in blockquotes**: Use > for quote formatting
3. **Question Type**: Either "MULTIPLE_CHOICE" (4 options) or "TEXT_INPUT" (no options, student writes answer)
4. **Options**: 
   - For MULTIPLE_CHOICE: Provide exactly 4 answer options (keep in same order as document, no a) b) c) d) prefixes)
   - **Use LaTeX for formulas** in style \\(f(x) = x^2\\). All backslashes must be doubled
   - **Use MARKDOWN for formatting**: *italic*, **bold**, <u>underline</u>
   - For TEXT_INPUT: Provide empty array []
5. **Reference**:
   - If the question has a visual element (diagram, graph, chart, table, image, or passage), set referenceType to the appropriate type
   - If the question is text-only with NO visual reference, set referenceType to "none" and use [0, 0, 0, 0] for boundingBox
   - For valid references, provide the bounding box coordinates [x1, y1, x2, y2] in percentages (0-100) relative to the page
6. **Topic**: The broad topic ID from the ALLOWED SAT CONCEPTS list (e.g., "math", "english")
7. **Subtopic**: The subtopic ID from the ALLOWED SAT CONCEPTS list (e.g., "algebra", "literacy")
8. **Concept**: **CRITICAL - The concept ID MUST be from the ALLOWED SAT CONCEPTS list above.** Match the question to the most appropriate concept ID. Do NOT create your own concept names.
9. **Difficulty Level**: Assess the difficulty based on:
   - EASY: Straightforward application of basic concepts, minimal steps required
   - MEDIUM: Requires understanding of concepts and multi-step reasoning
   - HARD: Complex reasoning, multiple concepts, or advanced problem-solving required

## IMPORTANT RULES:
- Do NOT include answers, hints, or explanations
- **Use LaTeX for mathematical formulas**:
  - Use \\( \\) for inline math, e.g., \\(f(x) = x^2\\)
  - Do NOT use "$" for LaTeX, use \\( \\) instead
  - ALL backslashes must be doubled (e.g., \\\\frac{1}{2})
- **Use MARKDOWN for text formatting**:
  - *italic* for emphasis
  - **bold** for strong emphasis
  - <u>underline</u> for underlined text
  - Use > for blockquotes (passages)
- **Apply formatting to both question content and options**
- **CRITICAL: Use standard ASCII quotes and apostrophes**:
  - Replace all smart/curly quotes (" " ' ') with standard straight quotes (" ')
  - Replace all special apostrophes with standard apostrophe (')
  - Replace all em-dashes (—) and en-dashes (–) with standard hyphens (-)
- **Reference Type**: Set to "none" for text-only questions, or "image"/"table"/"passage"/"graph"/"chart" if there's a visual element
- For text-only questions: referenceType="none", page=${startPage}, boundingBox=[0,0,0,0]
- **For questions with references**: Use page numbers ${startPage}, ${startPage + 1}, ..., ${endPage} (IGNORE printed page numbers). Provide accurate referenceType, page number, and bounding box [x1, y1, x2, y2] in percentages
- For MULTIPLE_CHOICE questions: MUST have exactly 4 options
- For TEXT_INPUT questions: Options array MUST be empty []
- **CRITICAL: Topic, Subtopic, and Concept MUST use the exact IDs from the ALLOWED SAT CONCEPTS list above. Do NOT make up your own values.**

## BEFORE SUBMITTING:
- **CRITICAL**: Count your extracted questions - you MUST have EXACTLY ${questionCount} questions
- Verify questions are numbered sequentially: 1, 2, 3, ..., ${questionCount} with NO GAPS
- If you have fewer than ${questionCount} questions, GO BACK and find the missing ones
- If you have more than ${questionCount} questions, you've made an error - review carefully

Use the 'extractQuestionsFromModule' tool to return the data.
`;
};


export interface ExtractedQuestionFromModule {
  questionNumber: number; // Question number within the module (1, 2, 3, ...)
  questionContent: string;
  questionType: 'MULTIPLE_CHOICE' | 'TEXT_INPUT';
  questionOptions: string[]; // Empty array for TEXT_INPUT, 4 options for MULTIPLE_CHOICE
  questionReference: {
    referenceType: 'none' | 'image' | 'graph' | 'chart' | 'table' | 'passage';
    page: number;
    boundingBox: number[];
    s3Key?: string; // Will be populated after uploading reference image
  };
  // Metadata
  topic: string; // e.g., "Algebra", "Advanced Math"
  subtopic: string; // e.g., "Linear equations", "Quadratic equations"
  concept: string; // e.g., "Solving for x", "Factoring"
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'; // Difficulty level
}