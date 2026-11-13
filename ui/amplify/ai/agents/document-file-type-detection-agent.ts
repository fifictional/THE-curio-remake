import { BaseAgent } from "./base-agent";
import { INTENT } from "../intents";
import { BaseAgentInput, AgentContext, AgentOutput } from "./types";

export interface DocumentFileTypeDetectionAgentInput extends BaseAgentInput {
  documentUuid: string;
  documentCount: number;
  documentMIMEType: string;
  fileUrl: string;
}


const FILE_TYPE_DETECTION_PROMPT = (documentCount: number, documentMIMEType: string) => `
You are an AI assistant tasked with analyzing a document to determine its media type and document type.

## GOAL

Analyze the document and determine:
1. **Media Type**: The specific type of media the document represents
2. **Document Type**: The academic document category it belongs to

## DOCUMENT INFORMATION
The document you are seeing is likely to be either a pdf or a markdown file.  If the file is a pdf, this may not be the original document and instead may have been converted from another document (.doc, .ppt, etc) or from a set of images. If the file is markdown then there is a high chance that it is the transcript of a YouTube video.  In either case, the document count and MIME type fields below will be useful in determining the source of the document.  When running the analysis, you should consider these fields when determining the source of the document.

If the mime type is "youtube", then base your analysis as if you has viewed the actual YouTube video, rather than reading the transcript of the video.

There are document count and MIME type fields below.  This is the information originally passed to the 
- Document Count: ${documentCount || 1}
- Document MIME Type: ${documentMIMEType}

## ANALYSIS PROCESS
**IMPORTANT** If the mime type is "youtube", then perform the whole analysis from the view point of the content.  i.e. speak as if you had viewed the actual YouTube video, rather than reading the transcript of the video.

### Step 1: Determine Source Type
First, determine if the document source is:
- **Photographic**: A photo or scan of a physical document (handwritten notes, printed pages, drawings, etc.)
- **Digital**: A native digital document (created digitally, not photographed/scanned)
- **YouTube**: A YouTube video transcript

### Step 2: Categorise Media Type
Based on the source type determination, identify the specific media type:

**If Photographic:**
- "handwritten notes" - Handwritten notes photographed or scanned
- "photo of drawn notes" - Hand-drawn diagrams, sketches, or notes photographed
- "photo of printout" - A printed document that was photographed
- "scanned document" - A document that was scanned (typically cleaner than a photo)

**If Digital:**
- "digital document" - A document created digitally (Word, PDF, etc.)
- "digital notes" - Digital notes created in apps like Notion, OneNote, etc.
- "digital presentation" - Slides or presentation materials

**If YouTube:**
- "youtube video" - A YouTube video.
- "youtube video with adverts" - A YouTube video that contains adverts, sponsored content or other paid promotions. **IMPORTANT** It is imperative that you use this if there is any sponsorship in either the transcript or the description.

### Step 3: Categorise Document Type
Determine which academic document type best fits the content:

- "Lecture Notes" - Notes from a lecture or class, or a recording of the actual class.
- "Lab Report" - Laboratory report or experiment documentation (textual or video)
- "Book Excerpt" - Excerpt from a textbook or book (textual or narrated)
- "Question Paper" - Exam or test questions
- "Assignment / Worksheet" - Assignment or worksheet
- "Practice Test" - Practice exam or test
- "Academic Paper" - Research paper or academic article
- "Article / Blog Post" - Article, blog post or vlog
- "Study Guide" - Study guide or review material
- "Cheat Sheet" - Quick reference, cheat sheet or short guide
- "Mind Map" - Visual mind map or concept map
- "Research Notes" - Research notes, findings or presentation
- "Image-only notes" - Notes that are primarily images with minimal text
- "Case study" - Case study or analysis (textual or video)

If the document type is unclear or doesn't fit any category, use null.

## OUTPUT FORMAT

Return **only** a valid JSON object with this structure:

\`\`\`json
{
  "mediaType": {
    "type": "handwritten notes",
    "explanation": "The document appears to be handwritten notes photographed with a mobile device, showing visible paper texture and natural lighting variations."
  },
  "documentType": {
    "type": "Lecture Notes",
    "explanation": "The content contains structured notes from a lecture, with headings, bullet points, and explanations of concepts covered in class."
  },
  "confidence": 8
}
\`\`\`

## RULES

- **Media Type**: Must be a specific string describing the media type (see examples above)
- **Document Type**: Must be one of the specified types or null
- **Explanations**: Provide clear, concise explanations (2-3 sentences) for both mediaType and documentType
- **Confidence**: Provide a confidence score from 1-10 based on how certain you are of the classifications
- Return **only** valid JSON. Do not include markdown code blocks, explanations, or any other text outside the JSON object.

Generate the JSON now.
`;

/**
 * Agent that detects file type, media type, and document type
 */
export class DocumentFileTypeDetectionAgent extends BaseAgent<DocumentFileTypeDetectionAgentInput> {
  name = 'document-file-type-detection-agent';
  description = 'Detects media type and document type of documents using AI';

  async execute(input: DocumentFileTypeDetectionAgentInput, context: AgentContext): Promise<AgentOutput> {
    const { documentUuid, documentCount, documentMIMEType, fileUrl } = input;

    // Call AI to analyze document (fileUrl will be extracted from input by callAI)
    const result = await this.callAI(
      {
        ...input,
        fileUrl,
      },
      context,
      {
        intent: INTENT.DOCUMENT_CATEGORIZATION,
        category: 'document',
        feature: 'file_type_detection',
        prompt: FILE_TYPE_DETECTION_PROMPT(documentCount, documentMIMEType),
        // Always use free tier models for file type detection
        temperature: undefined,
      }
    );

    if (result.error) {
      return this.createResponse(`Error detecting file type: ${result.error}`, {
        documentUuid,
        error: result.error,
      });
    }

    // Parse AI response
    let detectionResult: {
      mediaType?: {
        type: string;
        explanation: string;
      };
      documentType?: {
        type: string | null;
        explanation: string;
      };
      confidence?: number;
    } | null = null;

    if (result.responseText) {
      try {
        // Remove markdown code blocks if present
        const cleaned = result.responseText.replace(/^```json\s*|```$/g, '').trim();
        detectionResult = JSON.parse(cleaned);
      } catch (error) {
        console.error('Failed to parse file type detection response:', error);
        return this.createResponse(`Error parsing file type detection response: ${error}`, {
          documentUuid,
          error: 'Parse error',
        });
      }
    }

    return this.createResponse('File type detected successfully', {
      documentUuid,
      detection: detectionResult,
    });
  }
}

