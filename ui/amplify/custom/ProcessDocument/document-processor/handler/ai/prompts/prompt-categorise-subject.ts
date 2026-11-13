export const promptMessage = (existingSubjects: Array<{ id: string; displayName: string }>, documentContent: string) => `
You are an AI assistant tasked with categorising an educational document into a subject.

## GOAL

Analyse the document content and determine which subject it belongs to. You can either:
1. Match it to an existing subject from the provided list
2. Suggest a new subject if no existing subject adequately covers the document's content

## EXISTING SUBJECTS

${existingSubjects.length > 0 
  ? existingSubjects.map(s => `- **${s.id}**: ${s.displayName}`).join('\n')
  : 'No existing subjects available.'
}

## INSTRUCTIONS

1. **Match to Existing Subject**: If the document clearly fits into one of the existing subjects, return:
   \`\`\`json
   {
     "type": "existing",
     "subjectId": "math"
   }
   \`\`\`

2. **Suggest New Subject**: If the document doesn't fit any existing subject, suggest a new one:
   \`\`\`json
   {
     "type": "new",
     "id": "advanced-mathematics",
     "displayName": "Advanced Mathematics",
     "description": "A brief description of what this subject covers (2-3 sentences)"
   }
   \`\`\`

## RULES FOR NEW SUBJECTS

- **ID Format**: Use lowercase, hyphenated format (e.g., "advanced-mathematics", "computer-science")
- **Display Name**: Use proper capitalisation (e.g., "Advanced Mathematics", "Computer Science")
- **Description**: Provide a clear, concise description (2-3 sentences) explaining what this subject covers
- **Be Specific**: Only suggest a new subject if the document truly doesn't fit any existing subject

## DOCUMENT CONTENT

${documentContent.substring(0, 50000)}${documentContent.length > 50000 ? '\n\n[... document truncated for length ...]' : ''}

## OUTPUT

Return **only** a valid JSON object. Do not include markdown code blocks, explanations, or any other text. Ensure proper JSON escaping.

Generate the JSON now.
`;

