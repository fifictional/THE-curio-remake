import type { Schema } from "../../data/resource";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { deleteMetadataByTarget } from "../../utils/metadata";
import { deleteVectorsForDocument } from "../../utils/vector-store/vector-delete";

type Client = ReturnType<typeof import('aws-amplify/api').generateClient<Schema>>;

/**
 * Delete a single document and all its associated data
 * This function handles all the cascading deletes for a document
 */
export async function deleteDocumentData(
  client: Client,
  s3Client: S3Client,
  documentUuid: string,
  bucketName: string,
  openSearchIndex: string,
  logger?: { info: (msg: string, meta?: any) => void; warn: (msg: string, meta?: any) => void; error: (msg: string, meta?: any) => void }
): Promise<void> {
  const document = await client.models.Document.get({ documentUuid });
  if (!document.data) {
    throw new Error('Document not found');
  }

  const spaceUuid = document.data.spaceUuid;

  // Delete S3 files (don't delete youtube videos markdown)
  if (document.data.key && !document.data.youtubeVideoUuid) {
    try {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: document.data.key,
      }));
    } catch (error) {
      logger?.warn('Failed to delete S3 file', { key: document.data.key, error });
    }
  }

  if (document.data.originalKey && !document.data.youtubeVideoUuid) {
    try {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: document.data.originalKey,
      }));
    } catch (error) {
      logger?.warn('Failed to delete original S3 file', { key: document.data.originalKey, error });
    }
  }

  const deletePromises = [];

  // Delete document summaries
  const documentSummaries = await client.models.DocumentSummary.listDocumentSummaryByDocumentUuid({
    documentUuid,
  }, {
    selectionSet: ['documentSummaryUuid'],
    limit: 1000,
  });

  for (const summary of documentSummaries.data || []) {
    deletePromises.push(client.models.DocumentSummary.delete({
      documentSummaryUuid: summary.documentSummaryUuid,
    }));
  }

  // Delete document vision outputs
  const visionOutputs = await client.models.DocumentVisionOutput.listDocumentVisionOutputByDocumentUuid({
    documentUuid,
  }, {
    limit: 1000,
  });

  for (const visionOutput of visionOutputs.data || []) {
    deletePromises.push(client.models.DocumentVisionOutput.delete({
      documentVisionOutputUuid: visionOutput.documentVisionOutputUuid,
    }));
  }

  // Delete document sections
  const extractedContents = await client.models.DocumentSection.listDocumentSectionByDocumentUuid({
    documentUuid,
  }, {
    limit: 1000,
  });

  for (const extractedContent of extractedContents.data || []) {
    deletePromises.push(client.models.DocumentSection.delete({
      documentSectionUuid: extractedContent.documentSectionUuid,
    }));
  }

  // Delete flashcards
  const flashcards = await client.models.Flashcard.listFlashcardByDocumentUuidAndCreatedAt({
    documentUuid,
  }, {
    limit: 1000,
  });
  
  for (const flashcard of flashcards.data || []) {
    deletePromises.push(client.models.Flashcard.delete({
      flashcardUuid: flashcard.flashcardUuid,
      createdAt: flashcard.createdAt,
    }));
  }

  // Delete questions
  const questions = await client.models.Question.listQuestionByDocumentUuidAndCreatedAt({
    documentUuid,
  }, {
    limit: 1000,
  });

  for (const question of questions.data || []) {
    deletePromises.push(client.models.Question.delete({
      questionUuid: question.questionUuid,
      createdAt: question.createdAt,
    }));
  }

  // Delete tasks
  const tasks = await client.models.Task.listTaskByDocumentUuidAndCreatedAt({
    documentUuid,
  }, {
    limit: 1000,
  });

  for (const task of tasks.data || []) {
    deletePromises.push(client.models.Task.delete({
      taskUuid: task.taskUuid,
    }));
  }

  // Delete metadata
  try {
    const deletedCount = await deleteMetadataByTarget(client, documentUuid);
    if (deletedCount > 0) {
      logger?.info(`Deleted ${deletedCount} metadata entries for document`, { documentUuid });
    }
  } catch (error) {
    logger?.warn('Failed to delete metadata (non-fatal)', { documentUuid, error });
  }

  // Delete vector embeddings (OpenSearch and/or Qdrant)
  try {
    const deleted = await deleteVectorsForDocument(documentUuid);
    if (deleted > 0) {
      logger?.info(`Deleted ${deleted} vector chunks for document`, { documentUuid });
    }
  } catch (error) {
    logger?.warn('Failed to delete document vectors (non-fatal)', { documentUuid, error });
  }

  await Promise.all(deletePromises)

  // Delete document
  await client.models.Document.delete({
    documentUuid,
  });

  // Update space to trigger cascade (fake update)
  if (spaceUuid) {
    await client.models.Space.update({
      spaceUuid,
    }, {
      selectionSet: ['spaceUuid', 'name', 'userUuid', 'updatedAt', 'createdAt', 'documents.documentUuid', 'documents.spaceUuid'] as any,
    });
  }
}

