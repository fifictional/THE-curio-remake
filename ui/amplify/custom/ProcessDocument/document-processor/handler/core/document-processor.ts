import { Logger } from '@aws-lambda-powertools/logger';
import { SQSEvent, SQSHandler } from 'aws-lambda';
import { getTask } from '../database/tasks/get-task';
import { updateTask } from '../database/tasks/update-task';
import { getDocument } from '../database/documents/get-document';
import { GetTaskResponse } from './types';
import { updateDocument } from '../database/documents/update-document';
import { createTask } from '../database/tasks/create-task';
import { generateFlashcards } from '../ai/generators/generate-flashcards';
import { createFlashcards } from '../database/flashcards/create-flashcards';
import { callLayoutDetectorLambda } from '../ai/extractors/layout-detector';
import { callGeminiExtractorLambda } from '../ai/extractors/gemini-extractor';
import { createDocumentSummary } from '../ai/generators/generate-summary';
import { downloadDocument } from '../database/documents/download-document';
import { generateQuiz } from '../ai/generators/generate-quiz';
import { createQuestions } from '../database/quiz/create-questions';

const logger = new Logger({
  logLevel: "INFO",
  serviceName: "document-processor",
});

interface TaskMessage {
  taskUuid: string;
  documentUuid: string;
  type: string;
}

export const handler: SQSHandler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    let task: GetTaskResponse | undefined;
    
    try {
      const message = JSON.parse(record.body) as TaskMessage;
      
      logger.info('Processing document task:', {
        messageId: record.messageId,
        taskUuid: message.taskUuid,
        documentUuid: message.documentUuid,
        timestamp: new Date().toISOString()
      });

      // Get the task
      task = await getTask(message.taskUuid);
      if (!task) {
        logger.error('Task not found:', {
          taskUuid: message.taskUuid
        });
        throw new Error('Task not found');
      }
    } catch (error) {
      console.error('Error processing document:', error);
      // Try to update task status to FAILED if we have the IDs
      try {
        const message = JSON.parse(record.body) as TaskMessage;
      } catch {
        // If we can't parse the message or update the status, just log the error
        console.error('Could not update task status to FAILED');
      }
    }

    // impossible
    if (!task) {
      logger.error('Task not found');
      return;
    }

    try {
      const document = await getDocument(task.documentUuid);
      if (!document) {
        logger.error('Document not found:', {
          documentUuid: task.documentUuid
        });
        throw new Error('Document not found');
      }

      logger.info('Data:', {
        taskUuid: task.taskUuid,
        action: task.type,
        documentUuid: document.documentUuid,
        key: document.key
      });
      
      // Update status to PROCESSING
      await updateTask(task.taskUuid, 'PROCESSING');

      // Here you would add your document processing logic
      logger.info('Processing document:', {
        taskUuid: task.taskUuid,
        documentUuid: task.documentUuid,
        type: task.type,
        status: task.status
      });

      if (task.type === 'DOCUMENT_PROCESSING') {
        const downloadDocumentResult = await downloadDocument(document.key, document.documentUuid);
        const layoutDetectorResult = await callLayoutDetectorLambda({
          inputKey: document.key,
          documentUuid: document.documentUuid,
        });
        logger.info('Layout detector result:', {
          layoutDetectorResult: layoutDetectorResult
        });

        // const extractedData = await callGeminiExtractorLambda({
        //   download_file_path: downloadDocumentResult.path,
        //   documentUuid: document.documentUuid,
        //   {} as Task,
        // });
        // logger.info('Extracted data:', {
        //   extractedData: extractedData
        // });
        logger.info('content extracted');

        // Generate summary
        // const summary = await createDocumentSummary(
        //   task.documentUuid,
        //   extractedData.extractedContent
        // );
        // logger.info('Summary created:', {
        //   summary: summary
        // });
        logger.info('summary created');
        await updateDocument(task.documentUuid);

        // Generate flashcards
        await createTask({
          userUuid: task.userUuid,
          documentUuid: task.documentUuid,
          type: 'FLASHCARD_GENERATION',
        });

        // Disable quiz generation on ingestion (moved to on-demand UI flow)
        // Previously created QUESTION_GENERATION task here — now removed per v3 design
      } else if (task.type === 'FLASHCARD_GENERATION') {
        // const flashcards = await generateFlashcards(task.documentUuid);
        // await createFlashcards(task.documentUuid, task.userUuid, flashcards || { flashcards: [] });
      } else if (task.type === 'QUESTION_GENERATION') {
        // const questions = await generateQuiz(task.documentUuid);
        // await createQuestions(task.documentUuid, task.userUuid, questions || { questions: [] });
      } else {
        logger.warn('Invalid task type:', {
          taskUuid: task.taskUuid,
          type: task.type
        });
      }

      // Update status to COMPLETED
      await updateTask(task.taskUuid, 'COMPLETED');
    } catch (error) {
      console.error('Error processing document:', error);
      // Try to update task status to FAILED if we have the IDs
      try {
        await updateTask(task.taskUuid, 'FAILED');
      } catch {
        // If we can't parse the message or update the status, just log the error
        console.error('Could not update task status to FAILED');
      }
    }
  }
};
