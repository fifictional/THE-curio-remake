import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/extract-and-embed";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { Schema } from "@database-schema";
import { embedDocumentContent } from "../../utils/document-embedding";
import { v4 as uuidv4 } from "uuid";
import { withSentryLambdaHandler } from "../common/sentry-lambda";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env as any);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();


export async function downloadMd(s3Key: string, bucketName: string) {
  // First, try to download markdown file from S3
  try {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const s3Client = new S3Client({});
    if (bucketName) {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      });

      const response = await s3Client.send(command);
      if (response.Body) {
        const bodyContents = await response.Body.transformToString();
        return bodyContents;
      }
    } else {
      return ''
    }
  } catch (s3Error: any) {
    // If S3 download fails (file not found or other error), fall back to summary
    console.error('[parse document] Error downloading markdown from S3, falling back to summary:', s3Error.message);
    return ''
  }
}

interface ExtractAndEmbedEvent {
  documentUuid: string;
  userUuid: string;
}

const extractAndEmbedHandler = async (event: ExtractAndEmbedEvent) => {
  try {
    const { documentUuid, userUuid } = event;
    const bucket = process.env.AI_TUTOR_STORAGE_BUCKET_NAME || process.env.AWS_BUCKET_NAME || '';

    const document = await client.models.Document.get({ documentUuid });
    if (!document.data) {
      console.error('Document not found');
      throw new Error('Document not found');
    }

    const documentType = document.data.type?.toLowerCase() || '';
    const isYouTube = documentType.includes('youtube');

    // Construct the S3 key based on document type
    // use the document.key if it exists
    let s3KeyToDownload: string;
    if (isYouTube) {
      s3KeyToDownload = `student-documents/${userUuid}/${documentUuid}/youtube-transcript.md`;
    } else {
      s3KeyToDownload = `student-documents/${userUuid}/${documentUuid}/enriched-markdown.md`;
    }

    const text = await downloadMd(s3KeyToDownload, bucket);
    if (!text) {
      throw new Error('Document content not found for documentUuid: ' + documentUuid + ' and s3Key: ' + s3KeyToDownload);
    }

    // Use the reusable embedding function
    await embedDocumentContent(documentUuid, userUuid, text);
    
    // Update document's hasRagEmbeddings field
    await client.models.Document.update({
      documentUuid,
      hasRagEmbeddings: true,
      updatedAt: new Date().toISOString(),
    });

    // Update metadata for embedding completion
    try {
      const now = new Date().toISOString();
      
      await client.models.Metadata.create({
        metadataUuid: uuidv4(),
        targetUuid: documentUuid,
        targetType: 'document',
        name: 'embeddingCompletedTime',
        value: now,
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      console.error('[extract-and-embed] Error updating metadata:', error);
      // Don't fail the handler if metadata update fails
    }

    return {
      success: true,
      message: "Embeddings stored successfully",
    };
  } catch (err: any) {
    console.error("Failed to process embeddings:", err);
    throw new Error(err.message || "Failed to process embeddings");
  }
};

export const handler = withSentryLambdaHandler(extractAndEmbedHandler);

