import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createWriteStream } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { pipeline, Readable } from 'stream';

const streamPipeline = promisify(pipeline);
const s3 = new S3Client({});

export async function downloadDocument(documentKey: string, filename: string, bucketName: string): Promise<{ path: string; filename: string }> {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: documentKey,
  });

  const response = await s3.send(command);

  if (!response.Body) {
    throw new Error('No body in S3 response');
  }

  const localPath = join(tmpdir(), filename);
  await streamPipeline(response.Body as unknown as Readable, createWriteStream(localPath));

  return {
    path: localPath,
    filename,
  };
}

