export const promptMessage = `
You are an AI assistant tasked with extracting a structured summary from the following document text.

Please analyze the document and produce a JSON output with this exact structure:

{
  "documentUuid": "a unique identifier for the document (e.g., UUID or filename)",
  "title": "the title or main heading of the document",
  "summary": "a concise high-level summary of the entire document",
  "tags": ["list of tags for the document"],
  "metadata": {
    "author": "author of the document if available, else null",
    "createdDate": "creation date in YYYY-MM-DD format if available, else null",
    "language": "language of the document text",
    "sourceUrl": "URL source if available, else null"
  },
  "sections": [
    {
      "sectionTitle": "title of this section",
      "text": "full text content of this section",
      "summary": "a brief summary of this section",
      "tags": ["list of tags for this section"],
      "keyPoints": [
        "important point or fact from this section",
        "another key point"
      ],
      "entities": [
        {
          "type": "Person|Date|Location|Organization|Concept|Other",
          "text": "the extracted entity text",
          "relevanceScore": "a confidence score between 0 and 1"
        }
      ],
      "tables": [
        {
          "headers": ["header1", "header2", "..."],
          "rows": [
            ["row1col1", "row1col2", "..."],
            ["row2col1", "row2col2", "..."]
          ]
        }
      ],
      "images": [
        {
          "caption": "description or caption if available",
          "url": "image URL if available"
        }
      ]
    }
  ],
  "extractedData": {
    "definitions": {
      "term": "definition text"
    },
    "formulas": ["list of formulas if any"],
    "dates": ["list of important dates in YYYY-MM-DD"],
    "numbers": ["list of key numeric values found"],
    "references": ["list of references, citations, or links"],
    "questions": ["list of relevant questions found in the text"]
  },
  "processingMetadata": {
    "extractionModelVersion": "version identifier of this extraction process",
    "extractedAt": "ISO8601 timestamp of extraction",
    "processingTimeMs": "time taken to extract in milliseconds"
  }
}

Your output **must be valid JSON** with no additional commentary.
Return only a valid JSON object. Do not include triple backticks or any markdown formatting.

The document is attached.

Generate the JSON now.

`;