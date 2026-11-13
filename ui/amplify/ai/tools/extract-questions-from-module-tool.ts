import { FunctionTool } from "@ai-tools/types";

export const createExtractQuestionsFromModuleTool = (questionCount: number, startPage: number, endPage: number): FunctionTool => ({
  type: "function",
  name: "extractQuestionsFromModule",
  description: `Extract ALL ${questionCount} questions from this module without answers or explanations. MUST extract every single question - no gaps allowed.`,
  parameters: {
    questions: {
      type: "array",
      description: `Complete list of ALL ${questionCount} questions from THIS MODULE. MUST include every question with no gaps in numbering.`,
      minItems: questionCount,
      maxItems: questionCount,
      items: {
        type: "object",
        description: "A question extracted from the module",
        properties: {
          questionNumber: {
            type: "integer",
            description: "Question number within the module (1, 2, 3, ..., 27)"
          },
          questionContent: {
            type: "string",
            description: "The question text with LaTeX formulas in \\( \\) style and markdown formatting (*italic*, **bold**, <u>underline</u>, > for blockquotes)"
          },
          questionType: {
            type: "string",
            enum: ["MULTIPLE_CHOICE", "TEXT_INPUT"],
            description: "Type of question: 'MULTIPLE_CHOICE' for 4 options, 'TEXT_INPUT' for free text answers"
          },
          questionOptions: {
            type: "array",
            items: { type: "string" },
            description: "For multiple-choice: exactly 4 options in document order (no a/b/c/d prefixes) with LaTeX formulas in \\( \\) style and markdown formatting (*italic*, **bold**, <u>underline</u>). For text-input: empty array []"
          },
          questionReference: {
            type: "object",
            description: "Reference information. Use referenceType='none' for text-only questions with no visual elements.",
            properties: {
              referenceType: {
                type: "string",
                enum: ["none", "image", "graph", "chart", "table", "passage"],
                description: "Type of reference. Use 'none' if the question has no visual element, or specify the type of visual reference."
              },
              page: {
                type: "number",
                description: `Sequential page number from ${startPage} to ${endPage}. First page in this PDF is ${startPage}, second is ${startPage + 1}, etc. IGNORE printed page numbers. Use ${startPage} if referenceType is 'none'.`
              },
              boundingBox: {
                type: "array",
                items: { type: "number" },
                description: "Bounding box as [x_min, y_min, x_max, y_max] in percentages (0-100). Use [0,0,0,0] if referenceType is 'none'."
              }
            }
          },
          topic: {
            type: "string",
            description: "Topic ID from the ALLOWED SAT CONCEPTS list (e.g., 'math', 'english')"
          },
          subtopic: {
            type: "string",
            description: "Subtopic ID from the ALLOWED SAT CONCEPTS list (e.g., 'algebra', 'literacy')"
          },
          concept: {
            type: "string",
            description: "CRITICAL: Concept ID MUST be from the ALLOWED SAT CONCEPTS list. Match question to the most appropriate concept ID."
          },
          difficulty: {
            type: "string",
            enum: ["EASY", "MEDIUM", "HARD"],
            description: "Difficulty level: EASY (straightforward, basic concepts), MEDIUM (multi-step reasoning), HARD (complex reasoning, multiple concepts)"
          }
        }
      }
    }
  }
});


