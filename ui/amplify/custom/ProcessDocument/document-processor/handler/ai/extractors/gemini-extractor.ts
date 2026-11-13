import { readFile } from 'fs/promises';
import { downloadDocument } from "../../database/documents/download-document";
import { createAIClient } from "@ai-client";
import { INTENT } from '@ai-intents/types';
import { TIER } from '@ai-intents/tier';
import { UserContentItem } from "@ai-providers/types";
import { Task } from "../../../../common/types";
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { createUserRequest } from '../../database/user-requests/create-user-request';
import { GetDocumentResponse } from '../../core/types';
import { NoResponseError } from '../../errors/error';

export interface GeminiExtractorInput {
  document: GetDocumentResponse;
  download_file_path: string;
  documentUuid: string;
  task: Task;
}

const cloudwatchClient = new CloudWatchClient({});

export const callGeminiExtractorLambda = async (event: GeminiExtractorInput) => {
  // Extract parameters with fallback to support both naming conventions
  const download_file_path = event.download_file_path;
  
  // Validate required parameters
  if (!event.download_file_path) {
    throw new Error("No download file path provided");
  }

  // Step 1: read local file
  const downloadedDocument = await downloadDocument(download_file_path, "document.pdf");
  const fileBuffer = await readFile(downloadedDocument.path);

  // Step 2: Create prompt
  const prompt = `
    Convert files to Markdown format. 
    Requirements:
    - Extract all text accurately
    - Include all headings, paragraphs, lists, tables, etc.
    - Ensure markup is included as necessary such as bold, italics, super- or sub-scripts, etc.
    - Format lists and tables properly
    - Preserve document structure

    Provide only the Markdown output.`;

  const userContentItems: UserContentItem[] = [
    {
      mimeType: 'text/plain',
      content: 'Convert this PDF file',
    },
  ];

  if (event.document.type.toLowerCase().includes('youtube')) {
    userContentItems.push({
      mimeType: 'text/plain',
      content: fileBuffer.toString("base64"),
    });
  } else {
    userContentItems.push({
      mimeType: 'application/pdf',
      content: fileBuffer.toString("base64"),
    });
  }

  // Step 3: Send to Gemini
  const aiClient = createAIClient({
    userUuid: event.task.userUuid,
    saveTokenData: createUserRequest,
    cloudwatchClient,
    documentUuid: event.documentUuid,
  });

  const result = await aiClient.call({
    intent: INTENT.DOCUMENT_CONVERSION,
    userTier: TIER.FREE,
    prompt,
    userContent: userContentItems,
    category: 'document',
    feature: 'document_conversion',
    messages: [],
  });

  if (result.error) {
    throw new Error(result.error);
  }

  const { responseText } = result;

  // Check if responseText is null or empty
  if (!responseText) {
    throw new NoResponseError('No responseText received from Gemini extractor');
  }

  return {
    documentUuid: event.documentUuid,
    extractedContent: responseText, // ✅ Use the actual markdown response
  };
};