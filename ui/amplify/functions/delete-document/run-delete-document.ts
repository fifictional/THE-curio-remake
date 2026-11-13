import type { Schema } from '@database-schema';
import { generateClient } from 'aws-amplify/api';
import { Logger } from '@aws-lambda-powertools/logger';
import { S3Client } from '@aws-sdk/client-s3';
import { deleteDocumentData } from '../common/delete-document';

type DataClient = ReturnType<typeof generateClient<Schema>>;

export interface DeleteDocumentDeps {
  s3?: S3Client;
  bucketName: string;
  openSearchIndex: string;
  logger?: Logger;
}

const defaultLogger = new Logger({
  logLevel: 'INFO',
  serviceName: 'delete-document-handler',
});

export async function runDeleteDocument(
  client: DataClient,
  documentUuid: string,
  deps: DeleteDocumentDeps,
): Promise<boolean> {
  const logger = deps.logger ?? defaultLogger;

  if (!documentUuid) {
    logger.error('Document UUID is required');
    throw new Error('Document UUID is required');
  }

  const s3 = deps.s3 ?? new S3Client({});

  await deleteDocumentData(
    client,
    s3,
    documentUuid,
    deps.bucketName,
    deps.openSearchIndex,
    logger,
  );

  return true;
}
