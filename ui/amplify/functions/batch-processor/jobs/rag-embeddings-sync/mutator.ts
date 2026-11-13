import type { Schema } from "../../../../data/resource";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env as mutatorEnv } from '$amplify/env/batch-mutator';
import { Amplify } from 'aws-amplify';
import { generateClient } from "aws-amplify/api";
import { registerMutator } from "../../../../common/batch-processing";
import { JOB_NAME, RagEmbeddingsSyncJob } from "./interface";
import { hasEmbeddingsForDocument } from "../../../../utils/opensearchClient";
import { S3Client, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { embedDocumentContent } from "../../../../utils/document-embedding";
import { downloadMd } from "../../../../functions/extract-and-embed/handler";

// Initialize Amplify Data client for mutator
const { resourceConfig: mutatorResourceConfig, libraryOptions: mutatorLibraryOptions } = await getAmplifyDataClientConfig(
  mutatorEnv as any
);

Amplify.configure(mutatorResourceConfig, mutatorLibraryOptions);
const mutatorClient = generateClient<Schema>();

const s3Client = new S3Client({});
const bucketName = process.env.AI_TUTOR_STORAGE_BUCKET_NAME || process.env.AWS_BUCKET_NAME || '';

/**
 * Check if markdown file exists in S3
 */
async function checkMdFileExists(documentUuid: string): Promise<boolean> {
  try {
    const s3Key = `student-documents/${documentUuid}/${documentUuid}-enriched-markdown.md`;
    await s3Client.send(new HeadObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
    }));
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Check if transcript file exists in S3 (for YouTube videos)
 */
async function checkTranscriptFileExists(s3Key: string): Promise<boolean> {
  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
    }));
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Transcript files are already in text format, no conversion needed
 * This function is kept for backward compatibility with legacy JSON files
 */
function convertTranscriptToMarkdown(transcriptContent: string): string {
  // Try to parse as JSON for legacy files
  try {
    const transcription = JSON.parse(transcriptContent);
    if (Array.isArray(transcription)) {
      // Legacy format: Extract text from each segment and join them with newlines
      return transcription
        .map((segment: any) => segment.text)
        .join('\n\n');
    }
  } catch (error) {
    // Not JSON, already in text format
  }
  
  // Already in text format, return as-is
  return transcriptContent;
}

/**
 * Process a single document
 */
const processDocument = async (documentUuid: string, log: (message: string) => void): Promise<void> => {
  log(`Processing document: ${documentUuid}`);

  // Get the document to get userUuid
  const documentResponse = await mutatorClient.models.Document.get({ documentUuid });
  if (!documentResponse.data) {
    throw new Error(`Document not found: ${documentUuid}`);
  }

  const userUuid = documentResponse.data.userUuid;
  const currentHasRagEmbeddings = documentResponse.data.hasRagEmbeddings;
  const documentType = documentResponse.data.type?.toLowerCase() || '';
  const isYouTube = documentType.includes('youtube');
  const youtubeVideoUuid = documentResponse.data.youtubeVideoUuid;

  // Check if document already has embeddings
  const hasEmbeddings = await hasEmbeddingsForDocument(userUuid, documentUuid);
  
  if (hasEmbeddings) {
    log(`Document ${documentUuid} already has embeddings, skipping`);
    
    // Update hasRagEmbeddings to true if it's not already set
    if (currentHasRagEmbeddings !== true) {
      await mutatorClient.models.Document.update({
        documentUuid,
        hasRagEmbeddings: true,
        updatedAt: new Date().toISOString(),
      });
      log(`Updated hasRagEmbeddings to true for document ${documentUuid}`);
    }
    return;
  }

  log(`Document ${documentUuid} does not have embeddings, checking for content file...`);

  let contentFileExists = false;
  let s3KeyToDownload = '';

  if (isYouTube) {
    // For YouTube videos, get transcript key from YoutubeVideo table
    log(`Document ${documentUuid} is a YouTube video, checking for transcript file...`);
    
    if (!youtubeVideoUuid) {
      log(`No youtubeVideoUuid found for document ${documentUuid}, marking as no embeddings`);
      await mutatorClient.models.Document.update({
        documentUuid,
        hasRagEmbeddings: false,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    // Fetch YoutubeVideo to get transcriptKey
    const youtubeVideoResponse = await mutatorClient.models.YoutubeVideo.get({ youtubeVideoUuid });
    if (!youtubeVideoResponse.data) {
      log(`YoutubeVideo not found for uuid ${youtubeVideoUuid}, marking as no embeddings`);
      await mutatorClient.models.Document.update({
        documentUuid,
        hasRagEmbeddings: false,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    const transcriptKey = youtubeVideoResponse.data.transcriptKey;
    if (!transcriptKey) {
      log(`No transcriptKey found for YoutubeVideo ${youtubeVideoUuid}, marking as no embeddings`);
      await mutatorClient.models.Document.update({
        documentUuid,
        hasRagEmbeddings: false,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    // Check if transcript file exists at the location specified in transcriptKey
    contentFileExists = await checkTranscriptFileExists(transcriptKey);
    if (contentFileExists) {
      log(`Found transcript file at location: ${transcriptKey}, embedding from there...`);
      s3KeyToDownload = transcriptKey;
    } else {
      log(`Transcript file not found at ${transcriptKey}, marking as no embeddings`);
      await mutatorClient.models.Document.update({
        documentUuid,
        hasRagEmbeddings: false,
        updatedAt: new Date().toISOString(),
      });
      return;
    }
  } else {
    // For regular documents, check for markdown file
    log(`Document ${documentUuid} is a regular document, checking for MD file...`);
    contentFileExists = await checkMdFileExists(documentUuid);
    s3KeyToDownload = `student-documents/${documentUuid}/${documentUuid}-enriched-markdown.md`;
  }
  
  if (contentFileExists) {
    log(`MD file exists for document ${documentUuid}, embedding...`);
    
    // Download the content file
    const content = await downloadMd(s3KeyToDownload, bucketName);
    
    if (content) {
      log(`Embedding document ${documentUuid}...`);
      await embedDocumentContent(documentUuid, userUuid, content);
      
      // Update document's hasRagEmbeddings field
      await mutatorClient.models.Document.update({
        documentUuid,
        hasRagEmbeddings: true,
        updatedAt: new Date().toISOString(),
      });
      
      log(`Successfully embedded document ${documentUuid}`);
    } else {
      log(`Failed to download MD file for document ${documentUuid}, marking as no embeddings`);
      await mutatorClient.models.Document.update({
        documentUuid,
        hasRagEmbeddings: false,
        updatedAt: new Date().toISOString(),
      });
    }
  } else {
    log(`No MD file found for document ${documentUuid}, marking as no embeddings`);
    await mutatorClient.models.Document.update({
      documentUuid,
      hasRagEmbeddings: false,
      updatedAt: new Date().toISOString(),
    });
  }
};

// Register mutator
registerMutator({
  jobType: JOB_NAME,
  processJob: async (job: RagEmbeddingsSyncJob, log: (message: string) => void, jobId: string): Promise<void> => {
    const { documentUuid } = job;
    
    log(`Processing RAG embeddings sync for document: ${documentUuid}`);

    await processDocument(documentUuid, log);
  },
});

