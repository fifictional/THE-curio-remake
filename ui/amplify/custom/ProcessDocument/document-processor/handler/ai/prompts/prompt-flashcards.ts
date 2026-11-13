export const promptMessage = (documentSummary: string) => `
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

## DOCUMENT##

${documentSummary}

Generate the JSON now.
`;
