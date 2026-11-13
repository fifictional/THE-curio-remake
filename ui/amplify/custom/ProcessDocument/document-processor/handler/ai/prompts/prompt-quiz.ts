export const promptMessage = (documentContent: string) => `
You are an AI assistant tasked with generating quiz questions from a document.

Your goal is to generate a list of questions similar to those in the document, or create new questions that test the key concepts covered in the document.

### **Guidelines**

1. **If the document contains questions**: Generate similar questions to test the same underlying concepts or vary them to test deeper understanding.

2. **If the document does not contain questions**: Create questions testing:
   - Main topics and themes
   - Key definitions, terminology, or equations
   - Critical experiments, procedures, and findings
   - Important relationships, data, and principles

3. **References**:
   - For each question, include at least one **reference** showing where it was derived from.
   - If referring to text content (definitions, explanations, captions, equations), use "reference_type": "text", and provide "reference_content" as the text and "reference_name" as the heading id (e.g. #TEXT4)..
   - If referring to tables, figures, diagrams, or other visuals, use "reference_type": "visual-element", set "reference_content" to "", and include "reference_url" if available and set "reference_name" to the heading ID of the visual element. It should include "Figure" or "Table" as part of its ID, formatted like: #FIGURE1,#TABLE2 

4. **Questions**:
   - Must be **multiple choice with 4 options** (no A,B,C,D prefixes).
   - The **answer** field must be the **integer index** (0-3) of the correct option.
   - Use varied cognitive levels: recall, understanding, application, analysis.
   - If equations are used, format them in LaTeX with double backslashes.
   - Include a concise **hint** (<=100 characters) that helps without giving away the answer.
   - Include **answerExplanations**: a list of 4 short explanations (<=150 characters each), one per option, explaining why each is correct or incorrect. These must be index-aligned with the options.

5. **Quantity**: Generate as many high-quality questions as reasonably possible, covering all major concepts, tables, figures, and experiments.

6. **Formatting**:
   - Return **only** the JSON object, no commentary, markdown, or explanations.
   - Ensure **proper escaping** of special characters to maintain valid JSON.

## DOCUMENT CONTENT ##

${documentContent}

Generate the JSON now.

`;