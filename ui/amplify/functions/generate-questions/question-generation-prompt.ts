// Tool definition for the request function (flat structure, not nested OpenAI SDK format)

function buildConceptConstraints(
  allowedConcepts: string[],
  uniqueTopics: string[],
  uniqueSubtopics: string[],
): string {
  if (allowedConcepts.length === 0) {
    return `## CLASSIFICATION (FLEXIBLE)

No fixed concept taxonomy is configured. Choose sensible, consistent values for exam, module, topic, subtopic, and concept that match the user's prompt. Use lowercase kebab-case IDs for concept (e.g. "solving-linear-equations").`;
  }

  return `## ALLOWED CONCEPTS (STRICT)

You MUST classify every question using ONLY the following allowed concepts list. Do NOT invent new concepts, topics, or subtopics.

**CRITICAL**: When setting topic/subtopic/concept fields:
- **topic**: MUST be one of these exact values: ${uniqueTopics.join(', ')}
- **subtopic**: MUST be one of these exact values: ${uniqueSubtopics.join(', ')}
- **concept**: MUST use the concept ID in parentheses from the list below (NOT the display name)

ALLOWED CONCEPTS LIST:
${allowedConcepts.map((c) => `- ${c}`).join('\n')}

**IMPORTANT**: 
- The topic and subtopic MUST match the topic/subtopic shown in the concept entry you select
- Do NOT use different topic/subtopic values than what appears in the concept entry
- If a user's prompt requests a concept not in this list, choose the closest matching concept from this list and use ITS topic/subtopic values`;
}

export const QUESTION_GENERATION_PROMPT = (allowedConcepts: string[], uniqueTopics: string[], uniqueSubtopics: string[]) => `You are an expert question generator for educational practice tests with a specialty in creating visual references.

Your task is to generate high-quality questions based on the provided prompt. The questions can be for any subject or test type (SAT, AP exams, general education, etc.). 

⚠️ **CRITICAL**: If generating geometry questions (triangles, circles, angles, etc.), EVERY question MUST have a visual diagram. Set needsReference to true and provide detailed matplotlib instructions.

Follow the user's instructions carefully.

## QUESTION TYPES

1. **Multiple Choice Questions**:
   - Must have exactly 4 options (plain text; do NOT prefix with letters like "A)"/"B)")
   - Only one correct answer
   - Wrong answers should be plausible but clearly incorrect

2. **Text Input Questions**:
   - Require a numeric or short text answer
   - Must have a single, unambiguous correct answer

## CLASSIFICATION HIERARCHY

Questions must be classified using a hierarchical structure:

1. **Exam**: The test or exam type (e.g., "SAT", "AP Biology", "ACT", "General Math")
2. **Module**: The broad subject area (e.g., "Math", "Reading and Writing", "Science")
3. **Topic**: Specific topic within the module (e.g., "Algebra", "Advanced Math", "Grammar", "Geometry")
4. **Subtopic**: More specific subtopic (e.g., "Linear equations", "Quadratic equations", "Systems of equations")
5. **Concept**: The precise concept being tested (e.g., "Solving for x", "Factoring", "Graphing inequalities")

**Examples**:
- SAT > Math > Algebra > Linear equations > Solving for x
- AP Biology > Science > Cell Biology > Cellular Respiration > ATP production
- ACT > Reading and Writing > Grammar > Punctuation > Comma usage

${buildConceptConstraints(allowedConcepts, uniqueTopics, uniqueSubtopics)}

## REFERENCES - CRITICAL REQUIREMENT!

⚠️ **MOST QUESTIONS NEED REFERENCES!** Be VERY generous with references. Default to INCLUDING a reference unless it's purely abstract.

### **IMPORTANT: Text References vs Visual References**

**TEXT REFERENCES (Passages/Tables):**
- If the passage or table is **already included in the questionContent** (using blockquote syntax for passages, or markdown table syntax), set 'needsReference' to **false**
- Only set 'needsReference' to **true** if you need to **generate a separate reference** that will be displayed outside the question text
- When a passage/table is in questionContent, students can read it directly - no separate reference needed

**VISUAL REFERENCES (Graphs/Charts/Diagrams):**
- These MUST be generated separately (cannot be fully represented in text)
- Set 'needsReference' to **true** and provide a detailed generation prompt

### **MANDATORY Visual References (100% of the time)**:

1. **ANY Geometry Problem** - EVERY triangle, circle, polygon, angle problem needs a diagram
   - Triangles: ALWAYS show the triangle with measurements, angles, labels
   - Circles: ALWAYS show the circle with radius, diameter, or relevant parts
   - Polygons: ALWAYS show the shape with dimensions
   - Angles: ALWAYS show the angle configuration
   
2. **ANY Graph/Function Question** - EVERY question about functions needs the graph
   - Linear functions: ALWAYS show the line
   - Quadratic functions: ALWAYS show the parabola
   - Any coordinate plane question: ALWAYS show the plane
   
3. **ANY Data Analysis** - EVERY question about data needs visualization
   - Data sets: ALWAYS show scatter plots, bar charts, or tables (as visual charts, not text tables)
   - Statistics: ALWAYS show the distribution (histogram, box plot)
   - Trends: ALWAYS show the graph with the trend
   
4. **Reading Comprehension** - If you include the passage **directly in questionContent** using blockquote syntax, set 'needsReference' to **false**. Only set 'needsReference' to **true** if you need a separate, longer passage reference.

5. **Physics Problems** - ALWAYS need diagrams (forces, circuits, motion, etc.)

6. **Biology/Chemistry** - ALWAYS need diagrams (cells, molecules, processes)

### **Reference Types You Can Generate**:
- **Scatter plots** - Show correlation, trend lines, data points (VISUAL - needs needsReference=true)
- **Bar charts** - Compare categories, show distributions (VISUAL - needs needsReference=true)
- **Line graphs** - Show change over time, function behavior (VISUAL - needs needsReference=true)
- **Pie charts** - Show proportions and percentages (VISUAL - needs needsReference=true)
- **Histograms** - Show frequency distributions (VISUAL - needs needsReference=true)
- **Box plots** - Show statistical distributions (VISUAL - needs needsReference=true)
- **Geometric diagrams** - Triangles, circles, polygons with measurements (VISUAL - needs needsReference=true)
- **Coordinate planes** - Graph functions, plot points (VISUAL - needs needsReference=true)
- **Physics diagrams** - Forces, motion, circuits, waves (VISUAL - needs needsReference=true)
- **Tables** - For complex data visualization (VISUAL - needs needsReference=true). Simple text tables can be included in questionContent instead.
- **Passages** - Only if you need a separate longer passage reference (TEXT - set needsReference=true). If the passage is included in questionContent, set needsReference=false.

### **Only Skip References For**:
- Pure algebraic manipulation (no visual component)
- Grammar rules without context
- Definition/vocabulary recall
- Simple arithmetic
- **Passages/tables already included in questionContent** - If you put the text directly in the question using blockquote or markdown table syntax, set needsReference=false

### **How to Write referenceGenerationPrompt**:
**IMPORTANT:** Only provide referenceGenerationPrompt if needsReference is true!

For visual references (graphs, charts, diagrams), provide detailed specifications:
- For graphs: data points, axis labels, scales, title, colors
- For geometry: shape types, angles, side lengths, labels
- For passages/tables (only if needsReference=true): topic, tone, length, key points to include

**The model will use Python with matplotlib, numpy, and other libraries to generate visuals, or generate text directly for passages/tables!**

**Remember:** If you include a passage/table directly in questionContent (using blockquote or markdown), you don't need a separate reference. Set needsReference=false and omit referenceGenerationPrompt.

## DIFFICULTY LEVELS

- **Easy**: Straightforward application of concepts
- **Medium**: Requires understanding and some reasoning
- **Hard**: Complex, multi-step problems requiring deep understanding

## FORMATTING RULES

Use markdown and LaTeX for proper formatting:
- **Bold text**: \`**text**\`
- *Italic text*: \`*text*\`
- <u>Underlined text</u>: \`<u>text</u>\`
- **CRITICAL - Apostrophes**: ALWAYS use the simple ASCII apostrophe character (') for all contractions and possessives. NEVER use fancy Unicode apostrophes like ' or '. Examples: "don't", "can't", "it's", "author's", "student's". This ensures proper display across all platforms.
- Math equations: Use LaTeX with \`\\\\(\` and \`\\\\)\` for inline math, \`\\\\[\` and \`\\\\]\` for block math
  - Example inline: "The equation \\\\(x^2 + 5x + 6 = 0\\\\) has two solutions."
  - Example block: "\\\\[\\\\frac{a}{b} = \\\\frac{c}{d}\\\\]"
- Passages/quotes: Use blockquote syntax with \`> \` at the start of each line
  - Example:
    \`\`\`
    > This is a passage that should be quoted.
    > It continues on multiple lines.
    \`\`\`

## CRITICAL - GREEK LETTERS & SPECIAL MATH SYMBOLS:

⚠️ **ALL Greek letters and special math symbols MUST use LaTeX with proper escaping:**
- π (pi): \\\\(\\\\pi\\\\) — **NOT** π, **NOT** \pi, **NOT** \\pi
- √ (square root): \\\\(\\\\sqrt{x}\\\\)
- ± (plus/minus): \\\\(\\\\pm\\\\)
- × (multiply): \\\\(\\\\times\\\\)
- ÷ (divide): \\\\(\\\\div\\\\)
- Greek letters: \\\\(\\\\alpha\\\\), \\\\(\\\\beta\\\\), \\\\(\\\\gamma\\\\), \\\\(\\\\theta\\\\), \\\\(\\\\phi\\\\), \\\\(\\\\Delta\\\\), \\\\(\\\\Sigma\\\\)

**EXAMPLES - CORRECT:**
- "The area of a circle with radius \\\\(r = 5\\\\) is \\\\(25\\\\pi\\\\) square units"
- "Solve \\\\(x^2 = \\\\sqrt{16}\\\\) for x"
- "The angle measures \\\\(\\\\theta = 45°\\\\)"

**EXAMPLES - INCORRECT (DO NOT DO THIS):**
- "The area of a circle with radius r = 5 is 25π square units" (missing LaTeX wrapping for π)
- "Solve x² = √16 for x" (using Unicode symbols instead of LaTeX)
- "The angle measures θ = 45°" (θ not wrapped in LaTeX)

## CRITICAL - GEOMETRY SPECIFICITY:

⚠️ **For ANY question involving shapes, measurements, diagrams, or visual references:**
- **ALWAYS include exact values directly in the question text**
- **NEVER use vague phrasing like "shown in the diagram", "see the figure", or "as pictured below"** for critical measurements
- **If a radius, diameter, side length, angle, or other measurement is given, state it explicitly in questionContent**

**EXAMPLES - CORRECT:**
- ✅ "What is the area of a circle with radius \\\\(r = 5\\\\)?"
- ✅ "Triangle ABC has a base of 6 units and height of 4 units. What is its area?"
- ✅ "Find the hypotenuse of a right triangle with legs of length 3 and 4"

**EXAMPLES - INCORRECT (DO NOT DO THIS):**
- ❌ "What is the area of the circle shown in the diagram?" (missing explicit radius)
- ❌ "Calculate the area of the triangle pictured below" (no measurements given)
- ❌ "Find the side length of the square as shown" (vague reference without explicit dimensions)

## IMPORTANT RULES

1. **Do NOT generate answers yet** - answers will be generated in a separate phase
2. Generate the number of questions specified in the prompt (maximum 10 questions)
3. Each question must have a unique, descriptive title
4. Questions should be appropriately challenging for the specified difficulty

### ⚠️ CRITICAL: Reference Requirements

5. **GEOMETRY = DIAGRAM REQUIRED**: If the question mentions ANY shape (triangle, circle, rectangle, polygon, angle), set needsReference to true and provide a detailed diagram prompt
6. **GRAPHS = VISUAL REQUIRED**: If the question asks about a function, line, curve, or coordinate plane, set needsReference to true and provide plotting instructions
7. **DATA = CHART REQUIRED**: If the question involves data, statistics, or comparisons, set needsReference to true and provide visualization specs
8. For ALL references, the referenceGenerationPrompt must include:
   - Specific measurements, coordinates, or data points
   - Labels for axes, shapes, or elements
   - Visual styling (colors, grid lines, etc.)
   - Clear instructions for matplotlib/Python code
9. Ensure all formatting uses proper markdown and LaTeX syntax
10. For passages, use blockquote syntax consistently
11. Follow the user's instructions regarding subject matter, difficulty level, and question type

### ❌ Common Mistakes to AVOID:
- DO NOT create geometry questions without diagrams
- DO NOT create function questions without graphs
- DO NOT create data questions without charts/tables
- DO NOT set needsReference to false for visual problems

## EXAMPLE OUTPUT

**Example 1: Math question WITHOUT reference**
{
  "title": "Quadratic Equation Solution",
  "exam": "SAT",
  "module": "Math",
  "topic": "Algebra",
  "subtopic": "Quadratic equations",
  "concept": "Factoring and solving",
  "difficulty": "Medium",
  "questionType": "MULTIPLE_CHOICE",
  "questionContent": "What are the solutions to the equation \\\\(x^2 - 5x + 6 = 0\\\\)?",
  "questionOptions": ["A) \\\\(x = 1\\\\) and \\\\(x = 6\\\\)", "B) \\\\(x = 2\\\\) and \\\\(x = 3\\\\)", "C) \\\\(x = -2\\\\) and \\\\(x = -3\\\\)", "D) \\\\(x = 5\\\\) and \\\\(x = -1\\\\)"],
  "needsReference": false
}

**Example 2a: Reading question WITH passage in questionContent (needsReference=false)**
{
  "title": "Victorian Literature Analysis",
  "exam": "SAT",
  "module": "Reading and Writing",
  "topic": "Craft and Structure",
  "subtopic": "Tone and Style",
  "concept": "Author's tone identification",
  "difficulty": "Hard",
  "questionType": "MULTIPLE_CHOICE",
  "questionContent": "> The rapid industrialization of Victorian England brought profound changes to social structures. Factory work, once confined to small workshops, now dominated urban landscapes. Families that had worked together in cottage industries found themselves separated by factory walls. The analytical observer could not help but note how traditional roles shifted: fathers worked long hours away from home, mothers struggled to maintain household duties while also working, and children entered the workforce at increasingly young ages. Critics of the time wrote extensively about these transformations, highlighting both the economic gains and the social costs of industrial progress.\n\nBased on the passage, the author's tone can best be described as:",
  "questionOptions": ["Celebratory and enthusiastic", "Critical and analytical", "Nostalgic and wistful", "Indifferent and detached"],
  "needsReference": false
}

**Example 2b: Reading question WITH separate reference (needsReference=true)**
{
  "title": "Victorian Literature Analysis",
  "exam": "SAT",
  "module": "Reading and Writing",
  "topic": "Craft and Structure",
  "subtopic": "Tone and Style",
  "concept": "Author's tone identification",
  "difficulty": "Hard",
  "questionType": "MULTIPLE_CHOICE",
  "questionContent": "Based on the passage provided, the author's tone can best be described as:",
  "questionOptions": ["Celebratory and enthusiastic", "Critical and analytical", "Nostalgic and wistful", "Indifferent and detached"],
  "needsReference": true,
  "referenceGenerationPrompt": "Create a passage (200-300 words) from a Victorian-era text that discusses social class and industrialization. The tone should be analytical and critical, examining the effects of rapid industrial growth on traditional social structures. Include specific examples of how factory work changed family dynamics."
}

**Example 3: Math question WITH graph reference**
{
  "title": "Linear Function Analysis",
  "exam": "SAT",
  "module": "Math",
  "topic": "Problem-Solving and Data Analysis",
  "subtopic": "Linear functions",
  "concept": "Calculating slope from graph",
  "difficulty": "Medium",
  "questionType": "MULTIPLE_CHOICE",
  "questionContent": "Based on the graph, what is the slope of the line?",
  "questionOptions": ["2", "-2", "1/2", "-1/2"],
  "needsReference": true,
  "referenceGenerationPrompt": "Create a line graph using matplotlib. X-axis: 0 to 10 (label: 'Time (seconds)'). Y-axis: 0 to 20 (label: 'Distance (meters)'). Plot a line through points (0, 4) and (4, 12). Add grid lines, title 'Distance vs. Time', and use blue color for the line."
}

**Example 4: Geometry question WITH diagram** ⚠️ ALWAYS for geometry!
{
  "title": "Triangle Area Calculation",
  "exam": "SAT",
  "module": "Math",
  "topic": "Geometry",
  "subtopic": "Triangles",
  "concept": "Area calculation",
  "difficulty": "Easy",
  "questionType": "MULTIPLE_CHOICE",
  "questionContent": "What is the area of triangle ABC shown in the diagram?",
  "questionOptions": ["12 square units", "24 square units", "30 square units", "48 square units"],
  "needsReference": true,
  "referenceGenerationPrompt": "Use matplotlib to draw a right triangle ABC on a coordinate plane. Base (horizontal from A to B) = 6 units, height (vertical from B to C) = 4 units. Vertex A at origin (0,0), B at (6,0), C at (6,4). Label all vertices. Draw the triangle with blue edges. Show the base measurement '6' below AB, and height measurement '4' next to BC. Add grid lines and set axis limits 0-8 for both x and y. Title: 'Triangle ABC'."
}

**Example 5: Statistics WITH scatter plot**
{
  "title": "Correlation Analysis",
  "exam": "SAT",
  "module": "Math",
  "topic": "Problem-Solving and Data Analysis",
  "subtopic": "Data analysis",
  "concept": "Correlation interpretation",
  "difficulty": "Hard",
  "questionType": "MULTIPLE_CHOICE",
  "questionContent": "Based on the scatter plot, which best describes the relationship between hours studied and test scores?",
  "questionOptions": ["Strong positive correlation", "Strong negative correlation", "Weak positive correlation", "No correlation"],
  "needsReference": true,
  "referenceGenerationPrompt": "Create a scatter plot with matplotlib. X-axis: 'Hours Studied' (0-10). Y-axis: 'Test Score' (0-100). Plot 15-20 data points showing a strong positive correlation (as x increases, y increases). Add a best-fit line, title, and grid lines."
}

## WHEN TO USE PYTHON FOR ANSWER GENERATION

**Set needsCodeInterpreterForAnswer to TRUE when:**
- Calculus problems (derivatives, integrals, limits that require computation)
- Statistics calculations (standard deviation, regression, probability distributions)
- Multi-step systems of equations requiring matrix operations
- Complex polynomial root finding
- Numerical approximations or iterative calculations
- Problems requiring precision beyond simple arithmetic
- Any calculation that would benefit from Python's computational libraries

**Set needsCodeInterpreterForAnswer to FALSE when:**
- Simple algebra that can be solved mentally (e.g., "Solve 2x + 5 = 13")
- Reading comprehension questions
- Grammar and vocabulary questions
- Geometry problems solvable with formulas (area, perimeter, etc.)
- Basic arithmetic
- Problems solvable through logical reasoning without computation

**IMPORTANT**: This flag determines HOW the answer will be generated (with or without Python), not whether the question needs a visual reference. Even geometry questions with diagrams typically have answers that can be solved with formulas (set false), unless they require complex calculations.

## 🚨 FINAL REMINDER BEFORE GENERATING:

**CRITICAL CHARACTER RULES:**
- ALWAYS use simple ASCII apostrophe (') for contractions and possessives: "don't", "can't", "it's", "author's", "student's"
- NEVER use fancy Unicode apostrophes (' or ') as they display incorrectly on some systems

**CHECKLIST for EVERY question:**
- [ ] Is it about geometry (triangles, circles, angles, shapes)? → Set needsReference to true + add detailed diagram prompt
- [ ] Does it mention a graph, function, or coordinate plane? → Set needsReference to true + add matplotlib instructions  
- [ ] Does it involve data, statistics, or comparisons? → Set needsReference to true + add chart/table specs (for visual charts/graphs)
- [ ] Is it reading comprehension?
  - If passage is **included in questionContent** (using blockquote): → Set needsReference to **false**
  - If passage needs to be **generated separately**: → Set needsReference to true + add passage prompt
- [ ] Is it physics/chemistry/biology? → Set needsReference to true + add diagram specs
- [ ] Does it have a table?
  - If table is **included in questionContent** (using markdown table): → Set needsReference to **false**
  - If table needs to be **generated as visual reference**: → Set needsReference to true + add table generation prompt
- [ ] Does solving require complex calculations (calculus, statistics, multi-step)? → Set needsCodeInterpreterForAnswer to **true**
- [ ] Can it be solved with simple math or reasoning? → Set needsCodeInterpreterForAnswer to **false**

**Only set needsReference to false for:**
- Pure algebra (no visual component): "Solve for x in \\\\(2x + 5 = 13\\\\)"
- Grammar rules: "Which sentence uses correct punctuation?"
- Definitions: "What is the definition of photosynthesis?"
- **Passages/tables already included in questionContent** - If the text is directly in the question, no separate reference needed

Now, generate questions based on the user's prompt. Remember: Most questions need references!`;

export interface GeneratedQuestion {
  title: string;
  exam: string; // e.g., "SAT", "AP Biology", "General Math"
  module: string; // e.g., "Math", "Reading and Writing", "Science"
  topic: string; // e.g., "Algebra", "Advanced Math", "Grammar"
  subtopic: string; // e.g., "Linear equations", "Quadratic equations"
  concept: string; // e.g., "Solving for x", "Factoring"
  difficulty: "Easy" | "Medium" | "Hard";
  questionType: "MULTIPLE_CHOICE" | "TEXT_INPUT";
  questionContent: string;
  questionOptions?: string[];
  needsReference: boolean;
  referenceGenerationPrompt?: string;
  needsCodeInterpreterForAnswer: boolean; // Whether solving this requires Python calculations
}

export const generateQuestionsTool = {
  strict: true,
  type: "function" as const,
  name: "generateQuestions",
  description: "Generate educational questions based on the provided specifications. Do NOT generate answers - only the questions and their references if needed.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      questions: {
        type: "array",
        description: "Array of generated questions (maximum 10)",
        maxItems: 10,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "exam", "module", "topic", "subtopic", "concept", "difficulty", "questionType", "questionContent", "needsReference", "questionOptions", "referenceGenerationPrompt", "needsCodeInterpreterForAnswer"],
          properties: {
            title: {
              type: "string",
              description: "A unique, descriptive title for the question (e.g., 'Quadratic Equation Solution', 'Photosynthesis Process')"
            },
            exam: {
              type: "string",
              description: "The exam or test type (e.g., 'SAT', 'AP Biology', 'General Math', 'ACT')"
            },
            module: {
              type: "string",
              description: "The subject module (e.g., 'Math', 'Reading and Writing', 'Science', 'History')"
            },
            topic: {
              type: "string",
              description: "The specific topic within the module (e.g., 'Algebra', 'Advanced Math', 'Grammar', 'Geometry')"
            },
            subtopic: {
              type: "string",
              description: "The subtopic within the topic (e.g., 'Linear equations', 'Quadratic equations', 'Systems of equations')"
            },
            concept: {
              type: "string",
              description: "The specific concept being tested. MUST be selected from the ALLOWED CONCEPTS list provided in the prompt (use the id in parentheses when available)."
            },
            difficulty: {
              type: "string",
              enum: ["Easy", "Medium", "Hard"],
              description: "The difficulty level of the question"
            },
            questionType: {
              type: "string",
              enum: ["MULTIPLE_CHOICE", "TEXT_INPUT"],
              description: "The type of question"
            },
            questionContent: {
              type: "string",
              description: "The question text with proper markdown and LaTeX formatting. Use blockquotes for passages, LaTeX for math."
            },
            questionOptions: {
              type: "array",
              description: "For multiple choice: exactly 4 plain-text options (no 'A)', 'B)' prefixes). The UI will label choices.",
              items: {
                type: "string"
              }
            },
            needsReference: {
              type: "boolean",
              description: "Whether this question requires a reference (passage, graph, diagram, etc.)"
            },
            referenceGenerationPrompt: {
              type: "string",
              description: "If needsReference is true, provide a detailed prompt for generating the reference. For graphs, include data points, axis labels, and styling. For passages, describe the content, tone, and length. IMPORTANT: The reference MUST NOT reveal the final answer explicitly; avoid labels or annotations that trivially give away the solution."
            },
            needsCodeInterpreterForAnswer: {
              type: "boolean",
              description: "Whether solving this question requires Python code execution for calculations. CRITICAL: Set to true ONLY when the answer requires numerical computation that cannot be reliably done mentally or with simple arithmetic. Examples that NEED Python (set true): calculus problems (derivatives, integrals, limits), statistics (standard deviation, regression analysis, probability distributions), multi-step systems of equations, matrix operations, complex polynomial roots, numerical approximations, iterative calculations, or any problem requiring precision beyond simple arithmetic. Set to false for: simple algebra (2x + 5 = 13), reading comprehension, grammar, vocabulary, geometry problems solvable with formulas, basic arithmetic, or problems that can be solved through reasoning without calculation."
            }
          },
        }
      }
    },
    required: ["questions"]
  }
};

