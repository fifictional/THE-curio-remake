// ==================== ANSWER KEY MODULE IDENTIFICATION ====================

export const ANSWER_KEY_MODULE_IDENTIFICATION_PROMPT = `
Your task is to identify ALL modules in this SAT answer key document.

## UNDERSTANDING SAT ANSWER KEY STRUCTURE:
- SAT answer keys contain answers for MULTIPLE MODULES (typically 2-4 modules)
- Common modules: "Math Module 1", "Math Module 2", "Reading and Writing Module 1", "Reading and Writing Module 2"
- Each module's answers are grouped together, often with a clear header
- Modules may also be called "Section 1", "Section 2", etc.

## YOUR TASK:
Scan the entire document and identify:
1. **Module Number** (1, 2, 3, 4, etc.) - the order in which modules appear
2. **Module Name** - Either "Math" or "Reading and Writing"
3. **Start Page** - The page number where this module's answers begin
4. **End Page** - The page number where this module's answers end (approximately)
5. **Answer Count** - The number of answers in this module (usually matches the question count)

## CRITICAL - PAGE NUMBERING:
**IGNORE ALL PRINTED PAGE NUMBERS ON THE DOCUMENT!**

The document may have page numbers printed at the top or bottom of pages (like "Page 27", "27", etc.). **COMPLETELY IGNORE THESE!**

Instead, count pages sequentially starting from the very first page:
- **First page of the PDF** = Page 1 (even if it says "Page 27" on it)
- **Second page of the PDF** = Page 2 (even if it says "Page 28" on it)
- **Third page of the PDF** = Page 3 (even if it says "Page 29" on it)
- And so on...

Think of it like this: You open the PDF file. The first thing you see is page 1. You scroll/flip to the next page, that's page 2. Count pages in this order.

## IMPORTANT:
- List modules in the order they appear in the document
- Look for clear section breaks, headers indicating modules
- Answer keys usually list "Module 1: Questions 1-27" or similar
- The answer key document is typically much shorter than the question paper (usually 5-15 pages)

Use the 'identifyAnswerKeyModules' tool to return the data.
`;


export interface IdentifiedAnswerKeyModule {
  moduleNumber: number;
  moduleName: 'Math' | 'Reading and Writing';
  startPage: number;
  endPage: number;
  answerCount: number;
}
