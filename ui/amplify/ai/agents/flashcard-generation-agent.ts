import { BaseAgent } from "./base-agent";
import { INTENT } from "../intents";
import { BaseAgentInput, AgentContext, AgentOutput } from "./types";
import { UnifiedTool } from "@ai-tools/types";
import { generateFlashcardsTool } from "@ai-tools/generate-flashcards-tool";
import { UnifiedFunctionCall } from "@ai-providers/unified-types";

export interface FlashcardGenerationAgentInput extends BaseAgentInput {
  documentUuid: string;
  enrichedMarkdown?: string;
  fileUrl?: string;
}

const FLASHCARD_PROMPT_TEMPLATE = `
You are an AI assistant tasked with generating flashcards from a document summary.

## GOAL

Convert only the **most important, subject-relevant concepts** into clear, concise, and memory-optimized flashcards to aid student learning, and include references indicating where each flashcard concept was derived from.

### **Guidelines for creating effective flashcards**

1. **Title (Side A)**:
   - Use specific key terms, concepts, formulas, or processes.
   - Avoid general, vague, or overly broad titles.
   - ❌ Avoid: "History", "Important Points", "Experiment Summary"
   - ✅ Use: "Photoelectric Effect Equation", "Cutoff Frequency Definition", "Planck's Constant Calculation Formula"

2. **Content (Side B)**:
   - Provide clear, concise definitions, explanations, or formulas that reinforce the concept, no more than 30 words.
   - If including equations, format them in LaTeX with double escaped backslashes.

3. **References**:
   - For each flashcard, include at least one **reference** indicating where the concept originated in the document.
   - If referring to text (definitions, equations, explanations), use "reference_type": "text", and "reference_name" as the heading id (e.g. #TEXT4).
   - If referring to a table, figure, or diagram, use "reference_type": "visual-element", set "reference_content" to "", and "reference_name" as the heading id (e.g. #FIGURE1).

4. **Domain-Specific Focus**:
   - Only create flashcards relevant to the document's subject area (e.g. physics, economics, biology).
   - Use accurate terminology, constants, and units.

5. **Avoid Generalities and Redundancy**:
   - Do **not** create flashcards from general summaries, opinions, or filler content.
   - Each flashcard must introduce a **unique concept** without overlapping with others.

6. **Formatting**:
   - Return **only** the JSON object.
   - Do not include commentary, markdown, or explanations.
   - Ensure **proper JSON escaping**, especially for LaTeX backslashes.

Generate the JSON from the attached document now.
`;

const FLASHCARD_TOOLS: UnifiedTool[] = [generateFlashcardsTool];

/**
 * Agent that generates flashcards from document summaries
 */
export class FlashcardGenerationAgent extends BaseAgent<FlashcardGenerationAgentInput> {
  name = 'flashcard-generation-agent';
  description = 'Generates flashcards from document summaries';

  async execute(input: FlashcardGenerationAgentInput, context: AgentContext): Promise<AgentOutput> {
    const { documentUuid, enrichedMarkdown, fileUrl } = input;

    // Call AI to generate flashcards (userContent is extracted from input by callAI)
    const result = await this.callAI(
      {
        ...input,
        text: enrichedMarkdown ? `Generate flashcards from this document using the same language as the document\n${enrichedMarkdown}` : "Generated flashcards from the document using the same language as the document",
        fileUrl,
      },
      context,
      {
        intent: INTENT.GENERATE_FLASHCARDS,
        category: 'document',
        feature: 'document_flashcards',
        prompt: FLASHCARD_PROMPT_TEMPLATE,
        tools: FLASHCARD_TOOLS,
        temperature: 0.8,
      }
    );

    if (result.error) {
      return this.createResponse(`Error generating flashcards: ${result.error}`);
    }

    // Extract flashcards from function call output
    let flashcards: any = null;
    if (result.output) {
      for (const item of result.output) {
        if (item.type === 'function_call') {
          const functionCallItem = item as UnifiedFunctionCall;
          try {
            flashcards = JSON.parse(functionCallItem.arguments);
            break;
          } catch (error) {
            console.error('Failed to parse flashcard function call arguments:', error);
          }
        }
      }
    }

    if (!flashcards || !flashcards.flashcards || !Array.isArray(flashcards.flashcards)) {
      return this.createResponse('Failed to generate flashcards: Invalid response format', {
        documentUuid,
        error: 'Invalid flashcard format',
      });
    }

    return this.createResponse('Flashcards generated successfully', {
      documentUuid,
      flashcards: flashcards.flashcards,
    });
  }
}

