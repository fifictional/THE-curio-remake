import type { Schema } from "@database-schema";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/process-document-create-flashcards';
import { Amplify } from 'aws-amplify';
import { generateClient } from "aws-amplify/api";
import { FlashcardGenerationAgent, FlashcardGenerationAgentInput } from "@ai-agents/flashcard-generation-agent";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { updateTaskStatus } from "../../utils/process-document/task-status";
import { getUserTierInfo } from "../../utils/lambda-utils";
import { v4 as uuidv4 } from "uuid";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { NoFlashcardGenerated } from "@process-document/document-processor/handler/errors/error";
import { withSentryLambdaHandler } from "../common/sentry-lambda";

// Initialize Amplify Data client
const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env as any);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();

const bucketName = process.env.AI_TUTOR_STORAGE_BUCKET_NAME || process.env.AWS_BUCKET_NAME || '';
const cloudwatchClient = new CloudWatchClient({});
const s3Client = new S3Client({});
const lambdaClient = new LambdaClient({});
const EMBED_SPACE_FLASHCARDS_FUNCTION_NAME = process.env.EMBED_SPACE_FLASHCARDS_FUNCTION_NAME;

async function generatePresignedUrl(documentKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: documentKey,
  });

  // Generate presigned URL valid for 1 hour
  const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return presignedUrl;
}

interface CreateFlashcardsEvent {
  documentUuid: string;
  userUuid: string;
  taskUuid: string;
  enrichedMarkdown?: string;
  documentUrl: string;
}

const processDocumentCreateFlashcardsHandler = async (event: CreateFlashcardsEvent) => {
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

    // Get user tier information
    const { userTier } = await getUserTierInfo(client, userUuid, false);

    // Create agent input
    const agentInput: FlashcardGenerationAgentInput = {
      userUuid: userUuid,
      userTier,
      documentUuid: documentUuid,
      enrichedMarkdown,
      fileUrl,
    };

    // Call agent to generate flashcards
    const flashcardAgent = new FlashcardGenerationAgent();
    const result = await flashcardAgent.execute(agentInput, agentContext);

    if (!result.metadata?.flashcards) {
      throw new NoFlashcardGenerated('Failed to generate flashcards: No flashcards in response');
    }

    const flashcards = result.metadata.flashcards;

    // Create flashcard deck
    const deckUuid = uuidv4();
    const now = new Date().toISOString();

    // Create flashcards
    const flashcardItems = flashcards.map((flashcard: any) => ({
      flashcardUuid: uuidv4(),
      title: flashcard.title,
      content: flashcard.content,
      references: flashcard.references || [],
      createdAt: now,
      updatedAt: now,
    }));

    await client.models.FlashcardDeck.create({
      flashcardDeckUuid: deckUuid,
      userUuid: userUuid,
      flashcards: flashcardItems,
      createdAt: now,
      updatedAt: now,
    });

    // Update document with flashcard deck reference
    await client.models.Document.update({
      documentUuid: documentUuid,
      flashcardDeckUuid: deckUuid,
      updatedAt: new Date().toISOString(),
    });

    // Update metadata for flashcard generation completion
    try {
      const now = new Date().toISOString();

      await client.models.Metadata.create({
        metadataUuid: uuidv4(),
        targetUuid: documentUuid,
        targetType: 'document',
        name: 'flashcardGenerationCompletedTime',
        value: now,
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      console.error('[process-document-create-flashcards] Error updating metadata:', error);
      // Don't fail the handler if metadata update fails
    }

    // EOPRD-813: Embed flashcards immediately when document is in a space
    try {
      const doc = await client.models.Document.get({ documentUuid }, { selectionSet: ['spaceUuid'] });
      if (doc.data?.spaceUuid && EMBED_SPACE_FLASHCARDS_FUNCTION_NAME) {
        await lambdaClient.send(
          new InvokeCommand({
            FunctionName: EMBED_SPACE_FLASHCARDS_FUNCTION_NAME,
            InvocationType: 'Event',
            Payload: JSON.stringify({ spaceUuid: doc.data.spaceUuid, userUuid }),
          })
        );
      }
    } catch (embedError) {
      console.error('[process-document-create-flashcards] Error invoking embed-space-flashcards:', embedError);
      // Don't fail the handler - embedding is best-effort
    }

    return {
      flashcards: { flashcards },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating flashcards:', errorMessage);

    // Update task status to FAILED
    await updateTaskStatus(client, taskUuid, "FAILED", undefined, errorMessage);

    throw error;
  }
};

export const handler = withSentryLambdaHandler(processDocumentCreateFlashcardsHandler);

