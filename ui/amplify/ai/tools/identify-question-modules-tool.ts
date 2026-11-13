import { FunctionTool } from "@ai-tools/types";

export const identifyQuestionModulesTool: FunctionTool = {
  type: "function",
  name: "identifyQuestionModules",
  description: "Identify all modules in the SAT question paper document",
  parameters: {
    modules: {
      type: "array",
      description: "List of all modules found in the question paper, in order",
      items: {
        type: "object",
        description: "A module identified in the question paper",
        properties: {
          moduleNumber: {
            type: "integer",
            description: "Sequential module number (1, 2, 3, 4, etc.)"
          },
          moduleName: {
            type: "string",
            enum: ["Math", "Reading and Writing"],
            description: "The type of module"
          },
          startPage: {
            type: "integer",
            description: "PDF page number where module starts. Count from first page of PDF as 1, second as 2, etc. The document is typically 30-60 pages total. IGNORE any page numbers printed ON the pages."
          },
          endPage: {
            type: "integer",
            description: "PDF page number where module ends. Count from first page of PDF as 1, second as 2, etc. The document is typically 30-60 pages total. IGNORE any page numbers printed ON the pages."
          },
          questionCount: {
            type: "integer",
            description: "Number of questions in this module (as stated in the module header, e.g., 27)"
          }
        }
      }
    }
  }
};


