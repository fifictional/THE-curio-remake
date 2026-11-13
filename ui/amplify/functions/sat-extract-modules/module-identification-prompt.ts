// ==================== QUESTION PAPER MODULE IDENTIFICATION ====================

export const QUESTION_MODULE_IDENTIFICATION_PROMPT = `
Your task is to identify ALL modules in this SAT exam document.

## UNDERSTANDING SAT STRUCTURE:
- SAT exams contain **MULTIPLE MODULES** (typically 2-4 modules per exam)
- Common modules: "Math Module 1", "Math Module 2", "Reading and Writing Module 1", "Reading and Writing Module 2"
- Each module is clearly separated with a header or title page
- Modules may also be called "Section 1", "Section 2", etc.

## YOUR TASK:
Scan the entire document and identify:
1. **Module Number** (1, 2, 3, 4, etc.) - the order in which modules appear
2. **Module Name** - Either "Math" or "Reading and Writing"
3. **Start Page** - The PDF page number where the module begins
4. **End Page** - The PDF page number where the module ends
5. **Question Count** - The number of questions in this module (usually stated at the top of the module, e.g., "27 Questions")

## CRITICAL - PAGE NUMBERING:
**You are looking at a PDF document. Count pages like a PDF viewer does:**

- The VERY FIRST page you see = Page 1
- The NEXT page = Page 2
- The NEXT page = Page 3
- Continue counting sequentially through the document

**COMPLETELY IGNORE any page numbers that are PRINTED on the document itself** (like "Page 27" or "27" at the bottom/top of pages).

**Think of it like opening a PDF file:**
- You see the first page → That's page 1
- You press "next page" → That's page 2
- You press "next page" again → That's page 3
- And so on...

**IMPORTANT**: The document likely has 30-60 pages total. If you're finding page numbers over 100, you're reading the printed page numbers instead of counting sequentially. STOP and recount from the first page as page 1.

## IMPORTANT:
- List modules in the order they appear in the document
- Be thorough - scan ALL pages to find all modules
- Look for clear section breaks, headers, or title pages
- **CRITICAL**: Look at the module header/title page for the question count (e.g., "27 Questions", "22 Questions")
- The entire document is typically 30-60 pages long
- Each module is typically 10-20 pages long

Use the 'identifyQuestionModules' tool to return the data.
`;


export interface IdentifiedQuestionModule {
  moduleNumber: number;
  moduleName: 'Math' | 'Reading and Writing';
  startPage: number;
  endPage: number;
  questionCount: number;
}

