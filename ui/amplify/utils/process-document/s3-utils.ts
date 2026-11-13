import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({});

/**
 * Fetches enriched markdown content from S3
 * @param s3Key - The S3 key
 * @returns The markdown content as string, or null if not found
 */
export async function getContentFromS3(s3Key: string): Promise<string | null> {
  try {
    const buffer = await getObjectBuffer(s3Key, getBucketName());
    const content = buffer.toString('utf-8');
    console.info('Retrieved file content from S3', { s3Key });
    return content;
  } catch (error) {
    console.info('File content not found in S3', { s3Key, error });
  }
  
  return null;
}

/**
 * Returns the bucket name from environment, supporting both ProcessDocument (AWS_BUCKET_NAME)
 * and ProcessExamPaper (BUCKET_NAME) conventions.
 */
function getBucketName(): string {
  return process.env.AI_TUTOR_STORAGE_BUCKET_NAME || process.env.AWS_BUCKET_NAME || process.env.BUCKET_NAME || '';
}

/**
 * Downloads an S3 object and returns its Buffer.
 */
export async function getObjectBuffer(s3Key: string, bucket?: string): Promise<Buffer> {
  const bucketName = bucket || getBucketName();
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: s3Key,
  });

  const response = await s3Client.send(command);
  if (!response.Body) {
    throw new Error('No body in S3 response');
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as any) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

/**
 * Downloads an S3 object to a temporary file and returns the local file path.
 * If filename is not provided, a unique name will be generated.
 */
export async function downloadToTempFile(s3Key: string, bucket?: string, filename?: string): Promise<string> {
  const bucketName = bucket || getBucketName();
  const buffer = await getObjectBuffer(s3Key, bucketName);
  const localName = filename || `download-${uuidv4()}`;
  const localPath = join(tmpdir(), localName);
  await writeFile(localPath, buffer);
  return localPath;
}

/**
 * Uploads a buffer to S3 with the given key and content type. Returns the s3:// URL.
 */
export async function uploadBuffer(buffer: Buffer, key: string, contentType: string, bucket?: string): Promise<string> {
  const bucketName = bucket || getBucketName();
  if (!bucketName) throw new Error('Bucket name is not set');
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });
  await s3Client.send(command);
  return `s3://${bucketName}/${key}`;
}

