import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createWriteStream } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { pipeline, Readable } from 'stream';
import { Logger } from '@aws-lambda-powertools/logger';

const streamPipeline = promisify(pipeline);

const logger = new Logger({
  logLevel: 'INFO',
  serviceName: 'document-processor/downloadDocument',
});

const s3 = new S3Client({});

export const downloadDocument = async (documentKey: string, filename: string) => {
  logger.info('Downloading document', { documentKey });

  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: documentKey,
  });

  const response = await s3.send(command);

  if (!response.Body) {
    throw new Error('No body in S3 response');
  }

  const localPath = join(tmpdir(), filename);

  await streamPipeline(response.Body as unknown as Readable, createWriteStream(localPath));

  logger.info('document downlaoaded');

  return {
    path: localPath,
    filename,
  };
};
