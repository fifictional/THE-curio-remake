import type { Schema } from "@database-schema";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/process-document-datalab-submit';
import { Amplify } from 'aws-amplify';
import { generateClient } from "aws-amplify/api";
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { updateTaskStatus } from "../../utils/process-document/task-status";
import { withSentryLambdaHandler } from "../common/sentry-lambda";

// Initialize Amplify Data client
const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env as any);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();

const s3Client = new S3Client({});
const bucketName = process.env.AI_TUTOR_STORAGE_BUCKET_NAME || process.env.AWS_BUCKET_NAME || '';
const datalabApiKey = process.env.DATALAB_API_KEY || '';

interface DatalabSubmitEvent {
  taskUuid: string;
  documentUuid: string;
}

async function generatePresignedUrl(documentKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: documentKey,
  });

  const presignedUrl = await (getSignedUrl as any)(s3Client, command, { expiresIn: 300 });
  return presignedUrl;
}

async function submitToDatalab(presignedUrl: string, apiKey: string, webhookUrl: string): Promise<string> {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substr(2);

  const formDataParts = [
    `--${boundary}\r\n`,
    `Content-Disposition: form-data; name="file_url"\r\n\r\n`,
    presignedUrl,
    '\r\n',
    `--${boundary}\r\n`,
    `Content-Disposition: form-data; name="webhook_url"\r\n\r\n`,
    webhookUrl,
    '\r\n',
    `--${boundary}\r\n`,
    `Content-Disposition: form-data; name="output_format"\r\n\r\n`,
    'chunks,markdown\r\n',
    `--${boundary}\r\n`,
    `Content-Disposition: form-data; name="format_lines"\r\n\r\n`,
    'true\r\n',
    `--${boundary}\r\n`,
    `Content-Disposition: form-data; name="paginate"\r\n\r\n`,
    'false\r\n',
    `--${boundary}\r\n`,
    `Content-Disposition: form-data; name="use_llm"\r\n\r\n`,
    'true\r\n',
    `--${boundary}\r\n`,
    `Content-Disposition: form-data; name="force_ocr"\r\n\r\n`,
    'false\r\n',
    `--${boundary}--\r\n`
  ];

  const formDataBuffer = Buffer.concat(formDataParts.map(part =>
    typeof part === 'string' ? Buffer.from(part, 'utf8') : part
  ));

  const response = await fetch(`${process.env.DATALAB_API_URL}/api/v1/marker`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: formDataBuffer,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log("datalab failed", response.status, errorText)
    if (response.status === 429) {
      throw new Error(`RATE_LIMIT: Datalab rate limit exceeded: ${errorText}`);
    }
    if (response.status >= 500) {
      throw new Error(`SERVER_ERROR: Datalab server error: ${response.status} - ${errorText}`);
    }
    throw new Error(`API_ERROR: Datalab API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (!data.request_id) {
    throw new Error(`VALIDATION_ERROR: Datalab API did not return request_id`);
  }

  return data.request_id;
}

const processDocumentDatalabSubmitHandler = async (event: DatalabSubmitEvent) => {
  const { taskUuid, documentUuid } = event;

  if (!process.env.DATALAB_API_URL) {
    throw new Error('DATALAB_API_URL environment variable is required');
  }

  try {
    // Update task status to PROCESSING
    await updateTaskStatus(client, taskUuid, "PROCESSING", 20);

    // Get document from database
    const documentResponse = await client.models.Document.get({ documentUuid: documentUuid });
    if (!documentResponse.data) {
      throw new Error('Document not found');
    }

    const document = documentResponse.data;

    // Skip Datalab for YouTube videos
    if (document.type?.toLowerCase().includes('youtube')) {
      console.info('Skipping Datalab for YouTube video', { documentType: document.type, documentUuid });
      return {
        requestId: 'youtube-skipped'
      };
    }

    // Generate presigned S3 URL
    const presignedUrl = await generatePresignedUrl(document.key);

    const callBackUrl = process.env.datalabCallBackUrl as string | undefined;
    // Submit document to Datalab
    const requestId = await submitToDatalab(presignedUrl, datalabApiKey, callBackUrl || '');

    return {
      requestId
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to submit document to Datalab', { error: errorMessage });

    // Update task status to FAILED
    await updateTaskStatus(client, taskUuid, "FAILED", undefined, errorMessage);

    throw error;
  }
};

export const handler = withSentryLambdaHandler(processDocumentDatalabSubmitHandler);

