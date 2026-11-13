import { BaseAgent } from "./base-agent";
import { INTENT } from "../intents";
import { BaseAgentInput, AgentContext, AgentOutput } from "./types";

export interface ExistingSubject {
  id: string;
  displayName: string;
  description: string;
}

export interface DocumentCategorisationAgentInput extends BaseAgentInput {
  documentUuid: string;
  documentContent?: string;
  fileUrl?: string;
  existingSubjects: Array<ExistingSubject>;
}

const CATEGORISATION_PROMPT_TEMPLATE = (
  existingSubjects: Array<ExistingSubject>
) => `
You are an AI assistant tasked with categorising an educational document into a subject.

## GOAL

### Categorisation
Analyse the document content and determine which educational subject category the document belongs to. You can either:
1. Match it to an existing subject category from the provided list
2. Suggest a new subject category if no existing subject category adequately covers the document's content
You should also include a paragraph explaining why you categorised the document the way you did.

### Education Score
Once you have categorised the document, you will do an analysis of the content and score it based on how educational the content seems.  The idea here is to give low values to entertainment documents and high values to educational content.  This scale is from 1 to 10.  This score should be based on the content of the document, not just the title or description.  You should also include a paragraph explaining why you scored the document the way you did.

## SPECIAL CASES

The document content could be a YouTube video transcript.  This can be determined by the Document Content section appearing to be empty and the next section containing a Video ID.  In this situation, you should make your determination based on both the Description section (this is the description of the video provided in YouTube) and the textual content of the Transcript section.  The format of the transcript section is described in the Transcript Format section.

## EXISTING SUBJECT CATEGORIES

${existingSubjects.length > 0 
  ? existingSubjects.map(s => `- **${s.id}**: ${s.displayName} - ${s.description}`).join('\n')
  : 'No existing subject categories available.'
}

## INSTRUCTIONS

1. **Match to Existing Subject**: If the document clearly fits into one of the existing subject categories, return:
   \`\`\`json
   {
     "type": "existing",
     "subjectId": "math",
     "subjectExplanation": "The document is about mathematics and covers algebra, geometry, calculus, statistics, and mathematical reasoning essential for problem-solving and quantitative analysis.",
     "educationScore":4
     "educationScoreExplanation": "The document is about mathematics and covers algebra, geometry, calculus, statistics, and mathematical reasoning essential for problem-solving and quantitative analysis."
   }
   \`\`\`

2. **Suggest New Subject**: If the document doesn't fit any existing subject category, suggest a new one:
   \`\`\`json
   {
     "type": "new",
     "id": "advanced-mathematics",
     "displayName": "Advanced Mathematics",
     "description": "A brief description of what this subject covers (2-3 sentences)",
     "subjectExplanation": "The document is about mathematics and covers algebra, geometry, calculus, statistics, and mathematical reasoning essential for problem-solving and quantitative analysis.",
     "educationScore":4
     "educationScoreExplanation": "The document is about mathematics and covers algebra, geometry, calculus, statistics, and mathematical reasoning essential for problem-solving and quantitative analysis."
   }
   \`\`\`

## RULES FOR NEW SUBJECTS

- **ID Format**: Use lowercase, hyphenated format (e.g., "advanced-mathematics", "computer-science")
- **Display Name**: Use proper capitalisation (e.g., "Advanced Mathematics", "Computer Science")
- **Description**: Provide a clear, concise description (2-3 sentences) explaining what this subject covers
- **Be Specific**: Only suggest a new subject category if the document truly doesn't fit any existing subject category

## OUTPUT

Return **only** a valid JSON object. Do not include markdown code blocks, explanations, or any other text. Ensure proper JSON escaping.

Generate the JSON from the attached document now.
`;

/**
 * Agent that categorises documents into subjects
 */
export class DocumentCategorisationAgent extends BaseAgent<DocumentCategorisationAgentInput> {
  name = 'document-categorisation-agent';
  description = 'Categorises documents into subjects using AI';

  async execute(input: DocumentCategorisationAgentInput, context: AgentContext): Promise<AgentOutput> {
    const { documentUuid, enrichedMarkdown, fileUrl, existingSubjects } = input;

    // Call AI to categorise document (userContent is extracted from input by callAI)
    const result = await this.callAI(
      {
        ...input,
        text: enrichedMarkdown ? `Generate flashcards from this document\n${enrichedMarkdown}` : "Generated flashcards from the document",
        fileUrl,

      },
      context,
      {
        intent: INTENT.DOCUMENT_CATEGORIZATION,
        category: 'document',
        feature: 'document_categorisation',
        prompt: CATEGORISATION_PROMPT_TEMPLATE(existingSubjects),
        // Always use free tier models for categorisation
        temperature: undefined,
      }
    );

    if (result.error) {
      return this.createResponse(`Error categorising document: ${result.error}`, {
        documentUuid,
        error: result.error,
      });
    }

    // Parse AI response
    let categorisationResult: {
      type: string;
      subjectId?: string;
      id?: string;
      displayName?: string;
      description?: string;
    } | null = null;

    if (result.responseText) {
      try {
        // Remove markdown code blocks if present
        const cleaned = result.responseText.replace(/^```json\s*|```$/g, '').trim();
        categorisationResult = JSON.parse(cleaned);
      } catch (error) {
        console.error('Failed to parse categorisation response:', error);
        return this.createResponse(`Error parsing categorisation response: ${error}`, {
          documentUuid,
          error: 'Parse error',
        });
      }
    }

    return this.createResponse('Document categorised successfully', {
      documentUuid,
      categorisation: categorisationResult,
    });
  }
}

