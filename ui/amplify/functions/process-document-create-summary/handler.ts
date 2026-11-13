import type { Schema } from "@database-schema";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/process-document-create-summary';
import { Amplify } from 'aws-amplify';
import { generateClient } from "aws-amplify/api";
import { updateTaskStatus } from "../../utils/process-document/task-status";
import { v4 as uuidv4 } from "uuid";
import { DocumentSummaryAgent, DocumentSummaryAgentInput } from "@ai-agents/document-summary-agent";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { executeDBCommand, DocumentSummaryUpdateBatcher } from "@ai-agents/command-executors";
import type { DBCommand } from "@ai-agents/commands";
import { TIER } from "@ai-intents/tier";
import { withSentryLambdaHandler } from "../common/sentry-lambda";

// Initialize Amplify Data client
const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env as any);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();

const bucketName = process.env.AI_TUTOR_STORAGE_BUCKET_NAME || process.env.AWS_BUCKET_NAME || '';
const cloudwatchClient = new CloudWatchClient({});
const s3Client = new S3Client({});
const agent = new DocumentSummaryAgent();

async function generatePresignedUrl(documentKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: documentKey,
  });
  
  // Generate presigned URL valid for 1 hour
  const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return presignedUrl;
}

interface CreateSummaryEvent {
  documentUuid: string;
  documentType: string;
  userUuid: string;
  documentUrl: string;
  taskUuid: string;
}

const processDocumentCreateSummaryHandler = async (event: CreateSummaryEvent) => {
  const { documentUuid, documentType, userUuid, documentUrl, taskUuid } = event;

  try {
    const presignedUrl = await generatePresignedUrl(documentUrl);

    // Create document summary UUID but don't create the record yet - wait for first chunk
    const documentSummaryUuid = uuidv4();

    // generate empty document summary record
    await client.models.DocumentSummary.create({
      documentSummaryUuid,
      documentUuid: documentUuid,
      title: '',
      summary: '',
      tags: [],
      keyConcepts: [],
      status: 'started',
    });

    // Command execution state - use batcher for updateDocumentSummary commands
    // Reduced interval to 500ms for more responsive streaming (batcher will merge rapid updates)
    const documentSummaryBatcher = new DocumentSummaryUpdateBatcher(500);
    
    // Command execution function for streaming updates
    async function executeCommand(command: DBCommand): Promise<void> {
      try {
        // Use batcher for updateDocumentSummary commands to throttle database writes
        await executeDBCommand(command, client, { documentSummaryBatcher });
      } catch (error: any) {
        console.error(`[Handler] Error executing command ${command.type}:`, error);
      }
    }

    // Create agent context with command execution
    const context = {
      saveTokenData: async (tokenData: Schema['UserRequest']['createType']) => {
        await client.models.UserRequest.create(tokenData);
      },
      cloudwatchClient,
      depth: 0,
      maxDepth: 10,
      callAgent: async () => {
        throw new Error('Agent delegation not supported in document processing');
      },
      yieldCommand: (cmd: DBCommand) => {
        // Execute commands asynchronously (don't await to avoid blocking streaming)
        executeCommand(cmd).catch((error) => {
          console.error('[Handler] Error executing yielded command:', error);
        });
      },
    };

    // Execute agent to generate summary with streaming (BaseAgentInput properties are inherited)
    const agentInput: DocumentSummaryAgentInput = {
      userUuid: userUuid,
      userTier: TIER.TECHNICAL,
      documentUuid: documentUuid,
      documentType: documentType,
      documentSummaryUuid, // Pass UUID so agent can update it during streaming
      fileUrl: presignedUrl
    };
    
    const agentResult = await agent.execute(agentInput, context);

    // Flush any pending document summary updates
    await documentSummaryBatcher.flush(client);

    if (!agentResult.response) {
      throw new Error('Failed to generate summary: No response from agent');
    }

    const summary = agentResult.response;

    // Update document (mark as processed)
    await client.models.Document.update({
      documentUuid: documentUuid,
      updatedAt: new Date().toISOString(),
    });

    return {
      summary: summary,
      documentSummaryUuid,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating document summary:', errorMessage);
    
    // Update task status to FAILED
    await updateTaskStatus(client, taskUuid, "FAILED", undefined, errorMessage);
    
    throw error;
  }
};

export const handler = withSentryLambdaHandler(processDocumentCreateSummaryHandler);

