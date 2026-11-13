import type { Schema } from "@database-schema";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/process-document-categorise';
import { Amplify } from 'aws-amplify';
import { generateClient } from "aws-amplify/api";
import { DocumentCategorisationAgent, DocumentCategorisationAgentInput, ExistingSubject } from "@ai-agents/document-categorisation-agent";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { updateTaskStatus } from "../../utils/process-document/task-status";
import { getMixpanel } from "../../utils/mixpanel";
import { createMetadata } from "../../utils/metadata";
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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

/**
 * Slugify a string to create a valid subject ID
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface CategoriseDocumentEvent {
  documentUuid: string;
  userUuid: string;
  taskUuid: string;
  enrichedMarkdown?: string;
  documentUrl: string;
}

const processDocumentCategoriseHandler = async (event: CategoriseDocumentEvent) => {
  const { documentUuid, userUuid, taskUuid, enrichedMarkdown: eventEnrichedMarkdown, documentUrl } = event;

  let enrichedMarkdown: string | null | undefined = eventEnrichedMarkdown;
  let fileUrl: string | undefined = undefined;

  try {

    // Fetch enrichedMarkdown from S3 if null (too large) or undefined (not provided)
    if (enrichedMarkdown === null || enrichedMarkdown === undefined) {
      fileUrl = await generatePresignedUrl(`student-documents/${userUuid}/${documentUuid}/enriched-markdown.md`);
    } else if (enrichedMarkdown === 'youtube-skipped') {
      // Generate presigned URL from the documentUrl (S3 key) provided by convert-to-pdf step
      fileUrl = await generatePresignedUrl(documentUrl);
      enrichedMarkdown = undefined;
    }

    // Neptune decommissioned — categorise without existing subject graph
    const existingSubjects: Array<ExistingSubject> = [];

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
    const agentInput: DocumentCategorisationAgentInput = {
      userUuid,
      userTier: 'free', // Always use free tier for categorisation
      documentUuid,
      documentContent: enrichedMarkdown,
      fileUrl,
      existingSubjects,
    };

    // Call agent to categorise document
    const categorisationAgent = new DocumentCategorisationAgent();
    const result = await categorisationAgent.execute(agentInput, agentContext);

    if (!result.metadata?.categorisation) {
      console.warn('Failed to categorise document: No categorisation in response', { documentUuid });
      await client.models.Document.update({
        documentUuid,
        updatedAt: new Date().toISOString(),
      });
      return { subjectId: null };
    }

    const categorisation = result.metadata.categorisation;
    let subjectId: string | null = null;
    
    // Extract additional fields from categorisation result
    const subjectExplanation = (categorisation as any).subjectExplanation || null;
    const educationScore = (categorisation as any).educationScore !== undefined 
      ? String((categorisation as any).educationScore) 
      : null;
    const educationScoreExplanation = (categorisation as any).educationScoreExplanation || null;

    // Handle response - either use existing subject or create new one
    if (categorisation.type === 'existing' && categorisation.subjectId) {
      // Verify subject exists
      const subjectExists = existingSubjects.some((s: { id: string; displayName: string }) => s.id === categorisation.subjectId);
      if (subjectExists) {
        subjectId = categorisation.subjectId;
        
        // Track Mixpanel event
        const subject = existingSubjects.find((s: { id: string; displayName: string }) => s.id === subjectId);
        const mixpanel = await getMixpanel();
        if (mixpanel && subject) {
          mixpanel.track('document_categorised', {
            documentUuid,
            userUuid,
            subjectId,
            subjectDisplayName: subject.displayName,
            branch: process.env.AWS_BRANCH || 'local',
          });
        }
      }
    } else if (categorisation.type === 'new' && categorisation.id && categorisation.displayName) {
      // Create new suggested subject
      const newSubjectId = slugify(categorisation.id);
      const displayName = categorisation.displayName;
      const description = categorisation.description || '';
      
      // Check if subject already exists
      const subjectExists = existingSubjects.some((s: { id: string; displayName: string }) => s.id === newSubjectId);
      if (subjectExists) {
        subjectId = newSubjectId;
      } else {
        subjectId = newSubjectId;
        const mixpanel = await getMixpanel();
        if (mixpanel) {
          mixpanel.track('document_categorised', {
            documentUuid,
            userUuid,
            subjectId: newSubjectId,
            subjectDisplayName: displayName,
            branch: process.env.AWS_BRANCH || 'local',
          });
        }
      }
    }

    // Update document with subjectId (even if null, to ensure document is updated)
    await client.models.Document.update({
      documentUuid,
      subjectId: subjectId || undefined,
      updatedAt: new Date().toISOString(),
    });

    // Write metadata for categorisation results
    const metadataPromises = [];
    
    if (subjectId) {
      metadataPromises.push(
        createMetadata(client, {
          targetUuid: documentUuid,
          targetType: 'document',
          name: 'subjectId',
          value: subjectId,
        })
      );
    }
    
    if (subjectExplanation) {
      metadataPromises.push(
        createMetadata(client, {
          targetUuid: documentUuid,
          targetType: 'document',
          name: 'subjectExplanation',
          value: subjectExplanation,
        })
      );
    }
    
    if (educationScore !== null) {
      metadataPromises.push(
        createMetadata(client, {
          targetUuid: documentUuid,
          targetType: 'document',
          name: 'educationScore',
          value: educationScore,
        })
      );
    }
    
    if (educationScoreExplanation) {
      metadataPromises.push(
        createMetadata(client, {
          targetUuid: documentUuid,
          targetType: 'document',
          name: 'educationScoreExplanation',
          value: educationScoreExplanation,
        })
      );
    }

    metadataPromises.push(
      createMetadata(client, {
        targetUuid: documentUuid,
        targetType: 'document',
        name: 'categorisationCompletedTime',
        value: new Date().toISOString(),
      })
    );
    
    // Write all metadata entries (fire and forget - don't fail if metadata write fails)
    try {
      await Promise.all(metadataPromises);
      console.info('Metadata written successfully', { documentUuid, metadataCount: metadataPromises.length });
    } catch (error) {
      console.error('Failed to write metadata (non-fatal)', { documentUuid, error });
    }

    if (subjectId) {
      console.info('Document categorised successfully', { documentUuid, subjectId });
    } else {
      console.warn('Document categorisation failed or returned null', { documentUuid });
    }

    return {
      subjectId: subjectId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error categorising document:', errorMessage);
    
    // Update task status to FAILED
    await updateTaskStatus(client, taskUuid, "FAILED", undefined, errorMessage);
    
    throw error;
  }
};

export const handler = withSentryLambdaHandler(processDocumentCategoriseHandler);

