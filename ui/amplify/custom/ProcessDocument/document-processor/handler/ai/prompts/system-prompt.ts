export const promptMessage = (documentContent: string) => `
Given the following educational material (lesson, article, textbook section, or transcript), generate a comprehensive set of quiz questions and flashcards. The goal is to facilitate both active recall and conceptual understanding.

## Flashcards:
** Extract all key facts, definitions, formulas, and core concepts.
** For each, write a flashcard with a clear question/prompt on the front and a concise, unambiguous answer on the back.
** Do not include example problems, numeric answers, or detailed scenarios.
** Keep each card focused on the concept, method, or formula only.
** Use very concise prompts on side_A and only the formula/definition on side_B.

## Quiz Questions:
** Create a set of quiz questions covering the full range of material.
** Include Only one question type: multiple choice
** For multiple choice, include 1 correct answer and plausible distractors. CRITICAL: The correct answer *MUST* be the first option.
** Vary cognitive level: recall, understanding, application, analysis.
** Add tables and figures to the quiz questions if they are relevant to the question.
** Include a concise **hint** (<=100 characters) that helps without giving away the answer.
** Include **answerExplanations**: a list of 4 short explanations (<=150 characters each), one per option, explaining why each is correct or incorrect. These must be index-aligned with the options.
** Output of quiz generation is time sensitive and MUST be generated quickly!

## Requirements:
### Coverage and Structure:
** Ensure that all major topics and subtopics in the material are represented in the flashcards and quiz.
** Organize flashcards and questions by topic or section, if possible.

### Standalone Questions and Answers:
** Each flashcard or quiz question must be fully self-contained and make sense without requiring external context.
** Use precise language and, where relevant, include units, definitions, or context to ensure clarity.

### References:
** For each flashcard and quiz question, include at least one reference indicating where the concept originated in the document.
** If the reference is to textual content (e.g., a definition, formula, or explanation), add a field:
** "reference_type": "text"
** "reference_content": the text content of the reference
** "reference_name": the heading or anchor id (e.g., #TEXT4, #HEADER1)
** if the reference is to a table, add a field:
** "reference_type": "table"
** "reference_content": the WHOLE table content
** "reference_name": the heading or anchor id (e.g., #TABLE1)
** If the reference is to figure, or diagram, add a field:
** "reference_type": "visual-element"
** "reference_content": (leave blank)
** "reference_name": the heading or anchor id (e.g., _page_0_Figure_6.jpeg)

### Formatting:
** Quiz should be a list of questions from the content, output as json: {question_content:str, options: list(str}, answer: number of option position, references: list(str)}
** Flashcards should be a list of flashcard to show all the key concept of the content, output as json: {title: key_concept, content: explanation, references: list(str)}
** Clearly indicate the correct answer and explanation for each quiz item.
** Your output should be suitable for importing into a flashcard app (like Anki) and for use as a self-test or class quiz. The questions should be clear, well-written, and pedagogically sound.

## DOCUMENT CONTENT ##

${documentContent}
`;
