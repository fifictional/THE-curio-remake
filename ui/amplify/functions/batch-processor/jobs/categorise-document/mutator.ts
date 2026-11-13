import type { Schema } from "@database-schema";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env as mutatorEnv } from "$amplify/env/batch-mutator";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getMixpanel } from "@utils/mixpanel";

import { registerMutator } from "@common/batch-processing";
import { JOB_NAME, CategoriseDocumentJob } from "./interface";

import { getContentFromS3 } from "@utils/process-document/s3-utils";

import { DocumentCategorisationAgent, DocumentCategorisationAgentInput } from "@ai-agents/document-categorisation-agent";
import { DocumentFileTypeDetectionAgent, DocumentFileTypeDetectionAgentInput } from "@ai-agents/document-file-type-detection-agent";

import { getMetadataByTarget, setMetadata } from "@utils/metadata";

// Initialize Amplify Data client for mutator
const {
  resourceConfig: mutatorResourceConfig,
  libraryOptions: mutatorLibraryOptions,
} = await getAmplifyDataClientConfig(mutatorEnv as any);

Amplify.configure(mutatorResourceConfig, mutatorLibraryOptions);

const client = generateClient<Schema>();
const cloudwatchClient = new CloudWatchClient({});
const s3Client = new S3Client({});

const bucketName = process.env.AI_TUTOR_STORAGE_BUCKET_NAME || process.env.AWS_BUCKET_NAME || '';

let existingSubjectsCache: { id: string; displayName: string; description: string }[] = [];

/**
 * Generate presigned URL for S3 object
 */
async function generatePresignedUrl(documentKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: documentKey,
  });
  
  // Generate presigned URL valid for 1 hour
  const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return presignedUrl;
}

/**
 * Slugify a string to create a valid subject ID
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Process a single document categorisation and file type detection
 */
const processDocument = async (
  documentUuid: string,
  log: (message: string) => void
): Promise<void> => {
  if (existingSubjectsCache.length === 0) {
    log("Neptune decommissioned — categorising without existing subject graph");
    existingSubjectsCache = [];
  }

  log(`Processing document: ${documentUuid}`);

  // Get the document
  const documentResponse = await client.models.Document.get({ documentUuid });
  if (!documentResponse.data) {
    throw new Error(`Document not found: ${documentUuid}`);
  }

  const document = documentResponse.data;

  // Get all metadata for this document
  const allMetadata = await getMetadataByTarget(client, documentUuid);
  
  // Extract subjectId and documentType from metadata
  const subjectIdMetadata = allMetadata.find(m => m.name === 'subjectId');
  const documentTypeMetadata = allMetadata.find(m => m.name === 'documentType');
  
  const documentSubjectId = document.subjectId || null;
  const metadataSubjectId = subjectIdMetadata?.value || null;

  // Sync subjectId between Document and Metadata
  if (documentSubjectId && metadataSubjectId) {
    // Both exist - they should match
    if (documentSubjectId !== metadataSubjectId) {
      log(`Warning: subjectId mismatch for ${documentUuid}. Document: ${documentSubjectId}, Metadata: ${metadataSubjectId}. Syncing to Document value.`);
      await setMetadata(client, {
        targetUuid: documentUuid,
        targetType: 'document',
        name: 'subjectId',
        value: documentSubjectId,
      });
    }
  } else if (documentSubjectId && !metadataSubjectId) {
    // Document has it, metadata doesn't - copy to metadata
    log(`Copying subjectId from Document to Metadata: ${documentSubjectId}`);
    await setMetadata(client, {
      targetUuid: documentUuid,
      targetType: 'document',
      name: 'subjectId',
      value: documentSubjectId,
    });
  } else if (!documentSubjectId && metadataSubjectId) {
    // Metadata has it, document doesn't - copy to document
    log(`Copying subjectId from Metadata to Document: ${metadataSubjectId}`);
    await client.models.Document.update({
      documentUuid,
      subjectId: metadataSubjectId,
      updatedAt: new Date().toISOString(),
    });
  }

  // Determine final subjectId (after sync)
  const finalSubjectId = documentSubjectId || metadataSubjectId;

  // If subjectId is still missing, run categorisation agent
  if (!finalSubjectId) {
    log(`No subjectId found, running categorisation agent for ${documentUuid}`);
    
    // Fetch enriched markdown from S3
    const enrichedMarkdown = await getEnrichedMarkdown(document);
    if (!enrichedMarkdown) {
      log(`No enriched markdown found for document ${documentUuid}, skipping categorisation`);
    } else {
      await runCategorisationAgent(document, enrichedMarkdown, log);
    }
  } else {
    log(`Document ${documentUuid} already has subjectId: ${finalSubjectId}`);
  }

  // Check if documentType metadata exists
  if (!documentTypeMetadata) {
    log(`No documentType metadata found, running file type detection agent for ${documentUuid}`);
    await runFileTypeDetectionAgent(document, log);
  } else {
    log(`Document ${documentUuid} already has documentType: ${documentTypeMetadata.value}`);
  }
};

/**
 * Run categorisation agent and store all results
 */
async function runCategorisationAgent(
  document: any,
  enrichedMarkdown: string | null,
  log: (message: string) => void
): Promise<void> {
  // Create agent context
  const agentContext = {
    saveTokenData: async (tokenData: Schema["UserRequest"]["createType"]) => {
      await client.models.UserRequest.create(tokenData);
    },
    cloudwatchClient,
    depth: 0,
    maxDepth: 10,
    callAgent: async () => {
      throw new Error("Agent delegation not supported in document processing");
    },
    yieldCommand: () => {
      // Not used in document processing
    },
  };

  // Determine fileUrl if needed (for YouTube videos)
  let fileUrl: string | undefined = undefined;
  if (!enrichedMarkdown || enrichedMarkdown === 'youtube-skipped') {
    fileUrl = await generatePresignedUrl(document.key);
  }

  // Create agent input
  const agentInput: DocumentCategorisationAgentInput = {
    userUuid: document.userUuid,
    userTier: "free", // Always use free tier for categorisation
    documentUuid: document.documentUuid,
    documentContent: enrichedMarkdown ? enrichedMarkdown.substring(0, 50000) : undefined, // Limit content size
    fileUrl,
    existingSubjects: existingSubjectsCache,
  };

  // Call agent to categorise document
  const categorisationAgent = new DocumentCategorisationAgent();
  const result = await categorisationAgent.execute(agentInput, agentContext);

  if (!result.metadata?.categorisation) {
    console.warn(
      "Failed to categorise document: No categorisation in response",
      { documentUuid: document.documentUuid }
    );
    return;
  }

  const categorisation = result.metadata.categorisation;
  let subjectId: string | null = null;

  // Handle response - either use existing subject or create new one
  if (categorisation.type === "existing" && categorisation.subjectId) {
    // Verify subject exists
    const subjectExists = existingSubjectsCache.some(
      (s: { id: string; displayName: string; description: string }) =>
        s.id === categorisation.subjectId
    );
    if (subjectExists) {
      subjectId = categorisation.subjectId;

      // Track Mixpanel event
      const subject = existingSubjectsCache.find(
        (s: { id: string; displayName: string; description: string }) => s.id === subjectId
      );
      const mixpanel = await getMixpanel();
      if (mixpanel && subject) {
        mixpanel.track("document_categorised", {
          documentUuid: document.documentUuid,
          userUuid: document.userUuid,
          subjectId,
          subjectDisplayName: subject.displayName,
          branch: process.env.AWS_BRANCH || "local",
        });
      }
    }
  } else if (
    categorisation.type === "new" &&
    categorisation.id &&
    categorisation.displayName
  ) {
    // Create new suggested subject
    const newSubjectId = slugify(categorisation.id);
    const displayName = categorisation.displayName;
    const description = categorisation.description || "";

    // Check if subject already exists
    const subjectExists = existingSubjectsCache.some(
      (s: { id: string; displayName: string; description: string }) => s.id === newSubjectId
    );
    if (subjectExists) {
      subjectId = newSubjectId;
    } else {
      subjectId = newSubjectId;
      const mixpanel = await getMixpanel();
      if (mixpanel) {
        mixpanel.track("document_categorised", {
          documentUuid: document.documentUuid,
          userUuid: document.userUuid,
          subjectId: newSubjectId,
          subjectDisplayName: displayName,
          branch: process.env.AWS_BRANCH || "local",
        });
      }
    }
  }

  // Extract all fields from categorisation result
  const subjectExplanation = (categorisation as any).subjectExplanation || null;
  const educationScore = (categorisation as any).educationScore !== undefined 
    ? String((categorisation as any).educationScore) 
    : null;
  const educationScoreExplanation = (categorisation as any).educationScoreExplanation || null;

  // Store subjectId in both Document and Metadata
  if (subjectId !== null) {
    await client.models.Document.update({
      documentUuid: document.documentUuid,
      subjectId,
      updatedAt: new Date().toISOString(),
    });
    log(`Document ${document.documentUuid} categorised successfully with subjectId: ${subjectId}`);
  }

  // Store all categorisation metadata
  const metadataPromises = [];
  
  if (subjectId) {
    metadataPromises.push(
      setMetadata(client, {
        targetUuid: document.documentUuid,
        targetType: 'document',
        name: 'subjectId',
        value: subjectId,
      })
    );
  }
  
  if (subjectExplanation) {
    metadataPromises.push(
      setMetadata(client, {
        targetUuid: document.documentUuid,
        targetType: 'document',
        name: 'subjectExplanation',
        value: subjectExplanation,
      })
    );
  }
  
  if (educationScore !== null) {
    metadataPromises.push(
      setMetadata(client, {
        targetUuid: document.documentUuid,
        targetType: 'document',
        name: 'educationScore',
        value: educationScore,
      })
    );
  }
  
  if (educationScoreExplanation) {
    metadataPromises.push(
      setMetadata(client, {
        targetUuid: document.documentUuid,
        targetType: 'document',
        name: 'educationScoreExplanation',
        value: educationScoreExplanation,
      })
    );
  }

  metadataPromises.push(
    setMetadata(client, {
      targetUuid: document.documentUuid,
      targetType: 'document',
      name: 'categorisationCompletedTime',
      value: new Date().toISOString(),
    })
  );
  
  // Write all metadata entries
  try {
    await Promise.all(metadataPromises);
    log(`Stored categorisation metadata for ${document.documentUuid}`);
  } catch (error) {
    console.error('Failed to write categorisation metadata (non-fatal)', { documentUuid: document.documentUuid, error });
  }
}

/**
 * Run file type detection agent and store all results
 */
async function runFileTypeDetectionAgent(
  document: any,
  log: (message: string) => void
): Promise<void> {
  // Generate presigned URL from document key
  const fileUrl = await generatePresignedUrl(document.key);

  // Create agent context
  const agentContext = {
    saveTokenData: async (tokenData: Schema["UserRequest"]["createType"]) => {
      await client.models.UserRequest.create(tokenData);
    },
    cloudwatchClient,
    depth: 0,
    maxDepth: 10,
    callAgent: async () => {
      throw new Error("Agent delegation not supported in document processing");
    },
    yieldCommand: () => {
      // Not used in document processing
    },
  };

  // Create agent input
  const agentInput: DocumentFileTypeDetectionAgentInput = {
    userUuid: document.userUuid,
    userTier: 'free',
    documentUuid: document.documentUuid,
    documentCount: document.documentCount || 1,
    documentMIMEType: document.type || '',
    fileUrl,
  };

  // Call agent to detect file type
  const detectionAgent = new DocumentFileTypeDetectionAgent();
  const result = await detectionAgent.execute(agentInput, agentContext);

  if (!result.metadata?.detection) {
    console.warn('Failed to detect file type: No detection in response', { documentUuid: document.documentUuid });
    return;
  }

  const detection = result.metadata.detection;
  
  // Extract fields from detection result
  const mediaType = detection.mediaType;
  const documentType = detection.documentType;
  const confidence = detection.confidence;

  // Store all detection metadata
  const metadataPromises = [];
  
  if (mediaType) {
    if (mediaType.type) {
      metadataPromises.push(
        setMetadata(client, {
          targetUuid: document.documentUuid,
          targetType: 'document',
          name: 'mediaType',
          value: mediaType.type,
        })
      );
    }
    if (mediaType.explanation) {
      metadataPromises.push(
        setMetadata(client, {
          targetUuid: document.documentUuid,
          targetType: 'document',
          name: 'mediaTypeExplanation',
          value: mediaType.explanation,
        })
      );
    }
  }
  
  if (documentType) {
    if (documentType.type !== undefined && documentType.type !== null) {
      metadataPromises.push(
        setMetadata(client, {
          targetUuid: document.documentUuid,
          targetType: 'document',
          name: 'documentType',
          value: documentType.type ?? 'null',
        })
      );
    }
    if (documentType.explanation) {
      metadataPromises.push(
        setMetadata(client, {
          targetUuid: document.documentUuid,
          targetType: 'document',
          name: 'documentTypeExplanation',
          value: documentType.explanation,
        })
      );
    }
  }
  
  if (confidence !== undefined && confidence !== null) {
    metadataPromises.push(
      setMetadata(client, {
        targetUuid: document.documentUuid,
        targetType: 'document',
        name: 'fileTypeDetectionConfidence',
        value: String(confidence),
      })
    );
  }
  
  // Write all metadata entries
  try {
    await Promise.all(metadataPromises);
    log(`Stored file type detection metadata for ${document.documentUuid}`);
  } catch (error) {
    console.error('Failed to write file type detection metadata (non-fatal)', { documentUuid: document.documentUuid, error });
  }
}

async function getEnrichedMarkdown(document: any): Promise<string | null> {
  const documentType = document.type?.toLowerCase() || '';
  if (documentType.includes('youtube')) {
    return await getContentFromS3(document.key);
  }

  const s3Key = `student-documents/${document.documentUuid}/${document.documentUuid}-enriched-markdown.md`;
  return await getContentFromS3(s3Key);
}

// Register mutator
registerMutator({
  jobType: JOB_NAME,
  processJob: async (job: CategoriseDocumentJob, log: (message: string) => void) => {
    await processDocument(job.documentUuid, log);
  },
});

