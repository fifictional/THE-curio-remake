import type { Schema } from "@database-schema";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/process-document-datalab-retrieve';
import { Amplify } from 'aws-amplify';
import { generateClient } from "aws-amplify/api";
import { readFile } from 'fs/promises';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';
import { PDFDocument } from 'pdf-lib';
import { updateTaskStatus } from "../../utils/process-document/task-status";
import { downloadDocument } from "../../utils/process-document/download-document";
import { withSentryLambdaHandler } from "../common/sentry-lambda";

// Initialize Amplify Data client
const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env as any);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();

const s3Client = new S3Client({});
const bucketName = process.env.AI_TUTOR_STORAGE_BUCKET_NAME || process.env.AWS_BUCKET_NAME || '';
const datalabApiKey = process.env.DATALAB_API_KEY || '';

interface DatalabRetrieveEvent {
  documentUuid: string;
  taskUuid: string;
  userUuid: string;
  requestId: string;
}

interface VisionOutputItem {
  documentVisionOutputUuid: string;
  documentUuid: string;
  totalPages: number;
  pageNumber: number;
  className: string;
  confidence: number;
  bbox: string;
  text?: string;
  caption?: string;
}

async function checkDatalabResults(
  requestId: string,
  apiKey: string,
  attempt = 1,
  maxRetries = 50,
  delayMs = 10000
): Promise<any> {
  if (attempt > maxRetries) {
    throw new Error(
      `TIMEOUT: Datalab processing did not complete after ${maxRetries} attempts`
    );
  }

  const response = await fetch(
    `${process.env.DATALAB_API_URL}/api/v1/marker/${requestId}`,
    {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    if (response.status === 429) {
      throw new Error(`RATE_LIMIT: Datalab rate limit exceeded: ${errorText}`);
    }

    if (response.status === 422) {
      throw new Error(`VALIDATION_ERROR: Validation error: ${errorText}`);
    }

    throw new Error(
      `API_ERROR: Datalab API error: ${response.status} - ${errorText}`
    );
  }

  const data = await response.json();

  // ✅ Completed successfully
  if (data.status === "complete" && data.success) {
    return data;
  }

  // ❌ Explicit failure from Datalab
  if (data.status === "failed") {
    const errorMessage =
      data.error || "Datalab processing failed with unknown error";
    throw new Error(`DATALAB_FAILED: ${errorMessage}`);
  }

  // ⏳ Still processing
  if (data.status === "processing") {
    const nextDelay = attempt === 1 ? 5000 : delayMs;

    console.info(
      `[Datalab] Processing (attempt ${attempt}/${maxRetries}) – retrying in ${nextDelay}ms`
    );

    await new Promise((resolve) => setTimeout(resolve, nextDelay));

    return checkDatalabResults(
      requestId,
      apiKey,
      attempt + 1,
      maxRetries,
      delayMs
    );
  }

  // ❌ Defensive: unknown status
  throw new Error(`UNKNOWN_STATUS: ${JSON.stringify(data)}`);
}



async function uploadToS3(buffer: Buffer, key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return `s3://${bucketName}/${key}`;
}

async function saveVisionOutputs(visionItems: VisionOutputItem[]): Promise<void> {
  // Save with concurrency limit of 5
  const concurrencyLimit = 5;
  const chunks = [];
  for (let i = 0; i < visionItems.length; i += concurrencyLimit) {
    chunks.push(visionItems.slice(i, i + concurrencyLimit));
  }

  for (const chunk of chunks) {
    await Promise.all(chunk.map(item =>
      client.models.DocumentVisionOutput.create({
        documentVisionOutputUuid: item.documentVisionOutputUuid,
        documentUuid: item.documentUuid,
        totalPages: item.totalPages,
        pageNumber: item.pageNumber,
        bbox: item.bbox,
        className: item.className,
        confidence: item.confidence,
        caption: item.caption,
        text: item.text,
      })
    ));
  }
}

async function saveDatalabResultsToTables(documentUuid: string, userUuid: string, datalabResults: any, documentKey: string): Promise<void> {
  const downloadedDocument = await downloadDocument(documentKey, "document.pdf", bucketName);
  const fileBuffer = await readFile(downloadedDocument.path);
  const pdfDoc = await PDFDocument.load(fileBuffer);
  const pageCount = pdfDoc.getPageCount();

  const promises = [];
  let maxPageNumber = 1;

  // Save markdown to S3 in new format: {userUuid}/{documentUuid}/enriched-markdown.md
  if (datalabResults.markdown) {
    const markdownKey = `student-documents/${userUuid}/${documentUuid}/enriched-markdown.md`;
    await uploadToS3(Buffer.from(datalabResults.markdown, 'utf8'), markdownKey, 'text/markdown');
  }

  // Save chunks to DocumentVisionOutput table
  if (datalabResults.json?.children && Array.isArray(datalabResults.json.children)) {
    const visionItems: VisionOutputItem[] = [];

    for (let i = 0; i < datalabResults.json.children.length; i++) {
      const page = datalabResults.json.children[i];
      const pageWidth = page.bbox[2];
      const pageHeight = page.bbox[3];

      for (let j = 0; j < page.children.length; j++) {
        const block = page.children[j];
        let pageNumber = 1;

        if (block.id && typeof block.id === 'string') {
          const pageMatch = block.id.match(/\/page\/(\d+)\//);
          if (pageMatch) {
            pageNumber = parseInt(pageMatch[1], 10);
            maxPageNumber = Math.max(maxPageNumber, pageNumber);
          }
        }

        const bbox = block.bbox as [number, number, number, number] || [0, 0, 1000, 1000];
        const normalizedBbox = bbox.map((value, index) =>
          index === 0 || index === 2 ? value / pageWidth : value / pageHeight
        );

        visionItems.push({
          documentVisionOutputUuid: uuidv4(),
          documentUuid: documentUuid,
          totalPages: pageCount,
          pageNumber: pageNumber + 1,
          bbox: JSON.stringify(normalizedBbox),
          className: block.id || '',
          confidence: 1.0,
          caption: block.block_type || 'Text',
          text: block.html || ''
        });
      }
    }

    promises.push(saveVisionOutputs(visionItems));
  }

  // Save images to S3
  if (datalabResults.images && typeof datalabResults.images === 'object') {
    Object.entries(datalabResults.images).forEach(([imageKey, base64Data]) => {
      if (base64Data && typeof base64Data === 'string') {
        const buffer = Buffer.from(base64Data, 'base64');
        const s3Key = `student-documents/${userUuid}/${documentUuid}/${imageKey}`;
        promises.push(
          uploadToS3(buffer, s3Key, 'image/jpeg')
        );
      }
    });
  }

  await Promise.all(promises);
}

const processDocumentDatalabRetrieveHandler = async (event: DatalabRetrieveEvent) => {
  const { taskUuid, documentUuid, userUuid, requestId } = event;

  if (!process.env.DATALAB_API_URL) {
    throw new Error('DATALAB_API_URL environment variable is required');
  }

  if (!requestId) {
    throw new Error('Missing required parameter: requestId');
  }

  if (requestId === 'youtube-skipped') {
    console.info('Skipping Datalab for YouTube video', { documentUuid });
    return {
      enrichedMarkdown: 'youtube-skipped',
    };
  }

  try {

    // Check Datalab API for results
    const datalabResults = await checkDatalabResults(requestId, datalabApiKey);

    // Get document from database
    const documentResponse = await client.models.Document.get({ documentUuid });
    if (!documentResponse.data) {
      throw new Error('Document not found');
    }

    const document = documentResponse.data;

    // Save results to database and S3
    await saveDatalabResultsToTables(documentUuid, userUuid, datalabResults, document.key);

    // Update metadata for datalab completion
    try {
      const now = new Date().toISOString();

      await client.models.Metadata.create({
        metadataUuid: uuidv4(),
        targetUuid: documentUuid,
        targetType: 'document',
        name: 'datalabCompletedTime',
        value: now,
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      console.error('[process-document-datalab-retrieve] Error updating metadata:', error);
      // Don't fail the handler if metadata update fails
    }

    // Check if enriched markdown is too large for Step Functions payload
    const STEP_FUNCTION_PAYLOAD_SIZE_LIMIT = 256 * 1024; // 256KB
    const payloadSize = JSON.stringify(datalabResults.markdown).length;
    const isEnrichedMarkdownTooLarge = payloadSize > STEP_FUNCTION_PAYLOAD_SIZE_LIMIT;

    if (isEnrichedMarkdownTooLarge) {
      return {
        enrichedMarkdown: null,
      };
    } else {
      return {
        enrichedMarkdown: datalabResults.markdown,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error retrieving Datalab results:', errorMessage);

    // Update task status to FAILED
    await updateTaskStatus(client, taskUuid, "FAILED", undefined, errorMessage);

    throw error;
  }
};

export const handler = withSentryLambdaHandler(processDocumentDatalabRetrieveHandler);

