import { getGeminiApiKey } from "../../../../common/secrets/get-gemini-apikey";
import { promptMessage } from "../prompts/prompt-document-summary";
import { saveDocumentSummary } from "../../database/summaries/create-document-summary";
import { downloadDocument } from "../../database/documents/download-document";
import { readFile } from "fs/promises";
import { createUserRequest } from "../../database/user-requests/create-user-request";
import { createAIClient } from "@ai-client";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { v4 } from "uuid";
import { INTENT } from "@ai-intents/types";
import { TIER } from "@ai-intents/tier";
import { UserContentItem } from "@ai-providers/types";

const cloudwatchClient = new CloudWatchClient({});

export const createDocumentSummary = async (documentUuid: string, download_file_path: string, userUuid: string, documentType: string) => {
  const apiKey = await getGeminiApiKey();

  if (!apiKey) {
    throw new Error("Missing Gemini API key");
  }

  // Step 1: read local file
  const downloadedDocument = await downloadDocument(download_file_path, "document.pdf");
  const fileBuffer = await readFile(downloadedDocument.path);

  // Step 2: Create prompt
  const prompt = promptMessage();

  const userContentItems: UserContentItem[] = [
    {
      mimeType: 'text/plain',
      content: 'Generate a summary of this document',
    },
  ];

  if (documentType.toLowerCase().includes('youtube')) {
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
    userUuid,
    saveTokenData: createUserRequest,
    cloudwatchClient,
    documentUuid,
  });

  const result = await aiClient.call({
    intent: INTENT.DOCUMENT_SUMMARY,
    userTier: TIER.FREE,
    prompt,
    userContent: userContentItems,
    category: 'document',
    feature: 'document_summary',
    messages: [],
  });

  if (result.error) {
    throw new Error(result.error);
  }

  const { responseText } = result;

  let documentSummaryUuid: string | undefined;
    
  try {
    // const cleaned = responseText?.replace(/^```json\s*|```$/g, "").trim() || '{}';
    // const parsed = JSON.parse(cleaned);
    // const validatedData = validateDocumentSummaryOutput(parsed);
    
    // Save to database using the database module
    const result = await saveDocumentSummary({
      documentSummaryUuid: v4(),
      documentUuid,
      title: '',
      summary: responseText || '',
      tags: [],
      keyConcepts: [],
    });
    documentSummaryUuid = result.data?.createDocumentSummary?.documentSummaryUuid;
  } catch (error) {
    console.error("Failed to parse response:", error);
    console.log("Raw response:", responseText);
  }

  return {
    summary: responseText,
    documentSummaryUuid,
    statusCode: 200,
  };
}