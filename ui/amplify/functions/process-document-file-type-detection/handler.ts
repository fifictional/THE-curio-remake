import type { Schema } from "@database-schema";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/process-document-file-type-detection';
import { Amplify } from 'aws-amplify';
import { generateClient } from "aws-amplify/api";
import { DocumentFileTypeDetectionAgent, DocumentFileTypeDetectionAgentInput } from "@ai-agents/document-file-type-detection-agent";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createMetadata } from "../../utils/metadata";
import { withSentryLambdaHandler } from "../common/sentry-lambda";

// Initialize Amplify Data client
const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env as any);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();

const bucketName = process.env.AI_TUTOR_STORAGE_BUCKET_NAME || process.env.AWS_BUCKET_NAME || '';
const cloudwatchClient = new CloudWatchClient({});
const s3Client = new S3Client({});

async function generatePresignedUrl(documentKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: documentKey,
  });
  
  // Generate presigned URL valid for 1 hour
  const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return presignedUrl;
}

interface FileTypeDetectionEvent {
  documentUuid: string;
  documentCount: number;
  documentType: string;
  userUuid: string;
  documentUrl: string;
}

const processDocumentFileTypeDetectionHandler = async (event: FileTypeDetectionEvent) => {
  const { documentUuid, documentCount, documentType: documentMIMEType, userUuid, documentUrl } = event;

  // Generate presigned URL from the documentUrl (S3 key) provided by convert-to-pdf step
  const fileUrl = await generatePresignedUrl(documentUrl);

  // Create agent context
  const agentContext = {
    saveTokenData: async (tokenData: Schema['UserRequest']['createType']) => {
      await client.models.UserRequest.create(tokenData);
    },
    cloudwatchClient,
    depth: 0,
    maxDepth: 10,
    callAgent: async () => {
      throw new Error('Agent delegation not supported in document processing');
    },
    yieldCommand: () => {
      // Not used in document processing
    },
  };

  // Create agent input
  const agentInput: DocumentFileTypeDetectionAgentInput = {
    userUuid,
    userTier: 'free',
    documentUuid,
    documentCount,
    documentMIMEType,
    fileUrl,
  };

  // Call agent to detect file type
  const detectionAgent = new DocumentFileTypeDetectionAgent();
  const result = await detectionAgent.execute(agentInput, agentContext);

  if (!result.metadata?.detection) {
    console.warn('Failed to detect file type: No detection in response', { documentUuid: documentUuid });
    return { success: false, error: 'No detection result' };
  }

  const detection = result.metadata.detection;
  
  // Extract fields from detection result
  const mediaType = detection.mediaType;
  const documentType = detection.documentType;
  const confidence = detection.confidence;

  // Write metadata for detection results
  const metadataPromises = [];
  
  if (mediaType) {
    // Store mediaType and mediaTypeExplanation as separate fields
    if (mediaType.type) {
      metadataPromises.push(
        createMetadata(client, {
          targetUuid: documentUuid,
          targetType: 'document',
          name: 'mediaType',
          value: mediaType.type,
        })
      );
    }
    if (mediaType.explanation) {
      metadataPromises.push(
        createMetadata(client, {
          targetUuid: documentUuid,
          targetType: 'document',
          name: 'mediaTypeExplanation',
          value: mediaType.explanation,
        })
      );
    }
  }
  
  if (documentType) {
    // Store documentType and documentTypeExplanation as separate fields
    if (documentType.type) {
      metadataPromises.push(
        createMetadata(client, {
          targetUuid: documentUuid,
          targetType: 'document',
          name: 'documentType',
          value: documentType.type ?? 'null',
        })
      );
    }
    if (documentType.explanation) {
      metadataPromises.push(
        createMetadata(client, {
          targetUuid: documentUuid,
          targetType: 'document',
          name: 'documentTypeExplanation',
          value: documentType.explanation,
        })
      );
    }
  }
  
  if (confidence !== undefined && confidence !== null) {
    metadataPromises.push(
      createMetadata(client, {
        targetUuid: documentUuid,
        targetType: 'document',
        name: 'fileTypeDetectionConfidence',
        value: String(confidence),
      })
    );
  }
  
  // Write all metadata entries (fire and forget - don't fail if metadata write fails)
  await Promise.all(metadataPromises);
  console.info('Metadata written successfully', { documentUuid: documentUuid, metadataCount: metadataPromises.length });

  console.info('File type detected successfully', { 
    documentUuid: documentUuid, 
    mediaType: mediaType?.type,
    documentType: documentType?.type,
    confidence 
  });

  return {
    success: true,
    mediaType: mediaType?.type,
    documentType: documentType?.type,
    confidence,
  };
};

export const handler = withSentryLambdaHandler(processDocumentFileTypeDetectionHandler);

