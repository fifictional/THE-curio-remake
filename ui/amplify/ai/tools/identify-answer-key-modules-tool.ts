import { FunctionTool } from "@ai-tools/types";

export const identifyAnswerKeyModulesTool: FunctionTool = {
  type: "function",
  name: "identifyAnswerKeyModules",
  description: "Identify all modules in the SAT answer key document",
  parameters: {
    modules: {
      type: "array",
      description: "List of all modules found in the answer key, in order",
      items: {
        type: "object",
        description: "A module identified in the answer key",
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
            description: "Sequential page number where module answers start. Count from first page of PDF as 1, second as 2, etc. IGNORE any page numbers printed ON the pages."
          },
          endPage: {
            type: "integer",
            description: "Sequential page number where module answers end. Count from first page of PDF as 1, second as 2, etc. IGNORE any page numbers printed ON the pages."
          },
          answerCount: {
            type: "integer",
            description: "Number of answers in this module"
          }
        }
      }
    }
  }
};


