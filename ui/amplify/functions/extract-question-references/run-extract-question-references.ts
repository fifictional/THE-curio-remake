import type { Schema } from '@database-schema';
import { generateClient } from 'aws-amplify/data';
import { unlink } from 'fs/promises';

import { downloadToTempFile, uploadBuffer } from '../../custom/ProcessDocument/common/utils/s3-utils';
import { cropPdfRegion } from '../../custom/ProcessDocument/common/utils/pdf-utils';

type DataClient = ReturnType<typeof generateClient<Schema>>;

export interface ExtractReferencesInput {
  questionExtractJobUuid: string;
  questionUuids?: string[];
}

export interface ExtractReferencesOutput {
  success: boolean;
  processedCount: number;
}

async function getAllQuestionsForJob(
  client: DataClient,
  questionExtractJobUuid: string,
  questionUuids?: string[],
) {
  const questionsResponse =
    await client.models.ExtractedQuestion.listExtractedQuestionByQuestionExtractJobUuidAndModuleNumberAndQuestionNumber(
      { questionExtractJobUuid },
      { limit: 1000 },
    );

  if (!questionsResponse.data || questionsResponse.data.length === 0) {
    throw new Error(`No questions found for job: ${questionExtractJobUuid}`);
  }

  let questionsToProcess = questionsResponse.data;

  if (questionUuids && questionUuids.length > 0) {
    const questionUuidsSet = new Set(questionUuids);
    questionsToProcess = questionsToProcess.filter((q) =>
      questionUuidsSet.has(q.extractedQuestionUuid),
    );
    console.log(
      `Filtered to ${questionsToProcess.length} questions from ${questionUuids.length} provided UUIDs`,
    );
  }

  const questionsWithReferences = questionsToProcess.filter(
    (q) => q.questionReference && q.questionReference.referenceType !== 'none',
  );

  console.log(`Processing ${questionsWithReferences.length} questions with references`);

  return questionsWithReferences;
}

export async function runExtractQuestionReferences(
  client: DataClient,
  bucketName: string,
  input: ExtractReferencesInput,
): Promise<ExtractReferencesOutput> {
  console.log('Extract Question References - Event:', JSON.stringify(input, null, 2));

  const { questionExtractJobUuid, questionUuids } = input;

  try {
    const jobResponse = await client.models.QuestionExtractJob.get({
      questionExtractJobUuid,
    });
    if (!jobResponse.data) {
      throw new Error(`Job not found: ${questionExtractJobUuid}`);
    }
    const job = jobResponse.data;

    console.log('Found job:', job.questionExtractJobUuid, 'Status:', job.status);

    const questionsWithReferences = await getAllQuestionsForJob(
      client,
      questionExtractJobUuid,
      questionUuids,
    );

    if (questionsWithReferences.length === 0) {
      console.log('No questions with references to process');
      return { success: true, processedCount: 0 };
    }

    const pdfPath = await downloadToTempFile(job.s3Key, bucketName);
    console.log(`Downloaded PDF to: ${pdfPath}`);

    let processedCount = 0;

    console.log(
      `Setting ${questionsWithReferences.length} questions to EXTRACTING status...`,
    );
    await Promise.all(
      questionsWithReferences.map((question) =>
        client.models.ExtractedQuestion.update({
          extractedQuestionUuid: question.extractedQuestionUuid,
          referenceExtractionStatus: 'EXTRACTING',
          referenceExtractionError: null,
          updatedAt: new Date().toISOString(),
        }),
      ),
    );
    console.log('All questions marked as EXTRACTING');

    const questionsByPage = new Map<number, typeof questionsWithReferences>();
    for (const question of questionsWithReferences) {
      const page = question.questionReference!.page;
      if (!questionsByPage.has(page)) {
        questionsByPage.set(page, []);
      }
      questionsByPage.get(page)!.push(question);
    }

    for (const [pageNumber, pageQuestions] of questionsByPage) {
      console.log(`Processing page ${pageNumber} with ${pageQuestions.length} questions`);

      for (const question of pageQuestions) {
        try {
          const boundingBox = question.questionReference!.boundingBox.filter(
            (n: number | null): n is number => n !== null,
          );

          if (boundingBox.length !== 4) {
            throw new Error(
              `Invalid bounding box: expected 4 values, got ${boundingBox.length}`,
            );
          }

          const croppedBuffer = await cropPdfRegion(
            pdfPath,
            pageNumber,
            boundingBox,
            0.1,
            10,
          );

          const s3Key = `exam-papers/${job.userUuid}/${questionExtractJobUuid}/references/${question.extractedQuestionUuid}.pdf`;
          await uploadBuffer(croppedBuffer, s3Key, 'application/pdf', bucketName);

          console.log(
            `Cropped reference for question ${question.questionNumber}: ${s3Key}`,
          );

          await client.models.ExtractedQuestion.update({
            extractedQuestionUuid: question.extractedQuestionUuid,
            questionReference: {
              ...question.questionReference!,
              s3Key,
            },
            referenceExtractionStatus: 'EXTRACTED',
            referenceExtractionError: null,
            updatedAt: new Date().toISOString(),
          });

          processedCount++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error cropping reference';
          console.error(
            `Failed to crop reference for question ${question.questionNumber}:`,
            errorMessage,
          );

          await client.models.ExtractedQuestion.update({
            extractedQuestionUuid: question.extractedQuestionUuid,
            referenceExtractionStatus: 'FAILED',
            referenceExtractionError: errorMessage,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    try {
      await unlink(pdfPath);
    } catch {
      // ignore temp cleanup failures
    }

    console.log(`Successfully processed ${processedCount} reference(s)`);

    return { success: true, processedCount };
  } catch (error) {
    console.error('Error in reference extraction Lambda:', error);

    try {
      const questionsWithReferences = await getAllQuestionsForJob(
        client,
        questionExtractJobUuid,
        questionUuids,
      );

      for (const question of questionsWithReferences) {
        await client.models.ExtractedQuestion.update({
          extractedQuestionUuid: question.extractedQuestionUuid,
          referenceExtractionStatus: 'FAILED',
          referenceExtractionError:
            error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (failAllErr) {
      console.error('Failed to mark questions FAILED after top-level error:', failAllErr);
    }

    return { success: true, processedCount: 0 };
  }
}
