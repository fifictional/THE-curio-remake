import { BaseAgent } from "./base-agent";
import { INTENT } from "../intents";
import { BaseAgentInput, AgentContext, AgentOutput } from "./types";
import { handleStreamingResponse } from "./chat/helpers";
import { UpdateDocumentSummaryCommand } from "./commands";

export const SUMMARY_PROMPT = `You are Curio, an AI-powered study assistant for university students.
The user has uploaded a full academic document — lecture notes, textbook chapter, research paper, or similar. Your task is to create **clean, concise, helpful student-style notes**, structured the way a smart university student would take them. Use the same language as the document provided.
These notes will be used for revision, understanding, and turning into flashcards/quizzes later.
---
YOUR JOB:
Read the full document and identify language, all key concepts, processes, terms, examples, and patterns
Organize them into human-readable notes in **Markdown** in the same language as the document provided.
Automatically detect and create **appropriate tables** for: (update titles to the language of the document provided)
**Glossary of terms**
**Formula + usage**
**Side-by-side comparisons or differences**
**Process steps (if any)**
Format content using clear bullets, short paragraphs, and consistent spacing
Use **natural, student-friendly language** — avoid robotic or overly formal tone
Do **not** copy-paste long blocks of text. Summarize and rephrase.
Apply **study best practices** from active recall, spaced repetition, and concept mapping
---
STUDY BEST PRACTICES TO FOLLOW:
- Use atomic concepts (1 idea per bullet/definition) 
- Rephrase complex ideas simply (like explaining to a classmate) 
- Add short **examples or analogies** where useful 
- Use **headings and bullets** to make scanning easy 
- Include **tables for clarity** where structure helps 
- Mention **common misconceptions**, **mnemonics**, or **tips** if possible 
- Leave out filler — include only what would help in an exam or recall later 
- Highlight relationships between concepts (cause-effect, category, etc.)
---
OUTPUT FORMAT (IN MARKDOWN):

\`\`\`markdown
# Quick Summary
[A 3-5 sentence overview of what the document covers. Mention the topic, its importance, and what students will learn.]
---
## Key Concepts & Ideas
### [Concept Title]
[What it is]
[Why it matters / how it works]
[Short example or application]
### [Next Concept Title]
...
---
## Glossary of Terms
| Term           | Explanation                                                |
|----------------|-------------------------------------------------------------|
| Mitochondria   | Organelle that produces energy (ATP) in eukaryotic cells    |
| Homeostasis    | The process of maintaining internal balance in the body     |
---
## Formulas and Equations
| Formula / Name     | Meaning or Use Case                                   |
|--------------------|--------------------------------------------------------|
| E = mc²            | Relates energy and mass (Einstein's theory)           |
| P = V × I          | Calculates electrical power from voltage and current  |
---
## Comparison / Differences
| Topic A            | Topic B             |
|--------------------|---------------------|
| [Difference 1]     | [Difference 1]       |
| [Difference 2]     | [Difference 2]       |
| [Example/Usage]    | [Example/Usage]      |
---
## Step-by-Step Processes
### [Process Title]
[Step 1 - Short, clear]
[Step 2 - Short, clear]
...
---
## Real-World Examples
[Topic] is used in [field, technology, or industry]
[Brief, relatable example]
---
## Tips, Memory Aids, and Misconceptions
[Mnemonic if available]
[Common error students make]
[Easy way to remember something complex]
\`\`\`

**IMPORTANT:** Output your response in the Markdown format shown above and in the same language as the document provided. Do not include any JSON or other formatting. Focus on creating clear, structured notes that would help a student study and understand the material.`;

export interface DocumentSummaryAgentInput extends BaseAgentInput {
  documentUuid: string;
  documentType: string;
  documentSummaryUuid?: string; // UUID of the document summary to update during streaming
  fileUrl: string;
}

/**
 * Agent that generates document summaries from PDF or text content
 */
export class DocumentSummaryAgent extends BaseAgent<DocumentSummaryAgentInput> {
  name = 'document-summary-agent';
  description = 'Generates structured markdown summaries from academic documents';

  async execute(input: DocumentSummaryAgentInput, context: AgentContext): Promise<AgentOutput> {
    const { documentUuid, fileUrl, documentSummaryUuid } = input;

    // Stream AI to generate summary (fileUrl will be extracted from input by streamAI and sent as input_file)
    const stream = this.streamAI(
      {
        text: 'Generate a summary of this document using the same language as the document',
        ...input,
        fileUrl, // Pass fileUrl which will be sent to OpenAI as input_file with file_url
      },
      context,
      {
        intent: INTENT.DOCUMENT_SUMMARY,
        category: 'document',
        feature: 'document_summary',
        prompt: SUMMARY_PROMPT,
        temperature: undefined,
      }
    );

    // Custom context that converts message commands to summary commands
    const customContext = {
      yieldCommand: (cmd: any) => {
        // Convert message update commands to summary update commands
        if (cmd.type === 'updateMessage' && documentSummaryUuid) {
          // Determine status: started on first chunk, streaming for subsequent updates
          this.yieldCommand(context, {
            type: 'updateDocumentSummary',
            payload: {
              documentSummaryUuid,
              summary: cmd.payload.content || '',
              status: 'streaming',
            },
          } as UpdateDocumentSummaryCommand);
        } else {
          // Pass through other commands as-is
          this.yieldCommand(context, cmd);
        }
      },
    };

    try {
      // Handle streaming with common event handling, converting message updates to summary updates
      const { finalText, finalOutput } = await handleStreamingResponse(
        stream,
        customContext,
        documentSummaryUuid, // Pass documentSummaryUuid as messageUuid equivalent
        {}, // Use default handlers for web search and reasoning
        {
          yieldFinalUpdate: false, // We'll handle final update manually with summary command
        }
      );

      // Yield final update with summary command (status: completed)
      if (documentSummaryUuid && finalText) {
        this.yieldCommand(context, {
          type: 'updateDocumentSummary',
          payload: {
            documentSummaryUuid,
            summary: finalText,
            status: 'completed',
          },
        } as UpdateDocumentSummaryCommand);
      }

      if (!finalText) {
        throw new Error('No response from AI');
      }

      return this.createResponse(finalText, {
        documentUuid,
        summary: finalText,
      });
    } catch (error: any) {
      console.error('[DocumentSummaryAgent] Error streaming AI:', error);
      
      // Yield error update if we have a summary UUID (status: error)
      if (documentSummaryUuid) {
        this.yieldCommand(context, {
          type: 'updateDocumentSummary',
          payload: {
            documentSummaryUuid,
            summary: `Error: ${error.message || 'Failed to generate summary'}`,
            status: 'error',
          },
        } as UpdateDocumentSummaryCommand);
      }

      return this.createResponse(`Error: ${error.message || 'Failed to generate summary'}`);
    }
  }
}

