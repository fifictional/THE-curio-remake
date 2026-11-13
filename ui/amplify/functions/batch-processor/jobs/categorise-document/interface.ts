/**
 * Categorise Document Job
 * 
 * Creator: Queues every Document UUID that needs categorisation (documents without subjectId)
 * Mutator: Processes each document by:
 *   - Fetching enriched markdown/transcript from S3
 *   - Calling categoriseDocument() to categorise the document
 *   - Updating document with subjectId
 */

export const JOB_NAME = "categorise-document";

export type CategoriseDocumentJob = {
  documentUuid: string;
};

