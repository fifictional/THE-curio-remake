import { FunctionTool } from "@ai-tools/types";

export const generateFlashcardsTool: FunctionTool = {
  type: "function",
  name: "generate_flashcards",
  description: "Generate flashcards from a document summary",
  parameters: {
    flashcards: {
      type: "array",
      description: "List of flashcards to generate",
      minItems: 10,
      items: {
        type: "object",
        description: "A flashcard with title, content, and references",
        properties: {
          title: {
            type: "string",
            description: "The key concept or term (side A)"
          },
          content: {
            type: "string",
            description: "The explanation, definition, or details (side B)"
          },
          references: {
            type: "array",
            description: "References for the flashcard's content",
            items: {
              type: "object",
              description: "A reference to the source of the flashcard content",
              properties: {
                reference_type: {
                  type: "string",
                  description: "Type of reference",
                  enum: ["text", "visual-element"]
                },
                reference_name: {
                  type: "string",
                  description: "Heading id, e.g. #SECTION_HEADER2"
                },
                reference_content: {
                  type: "string",
                  description: "Content if reference_type is text, empty string otherwise"
                },
                reference_url: {
                  type: "string",
                  description: "URL if reference_type is visual-element, empty string otherwise"
                }
              }
            }
          }
        }
      }
    }
  }
};


