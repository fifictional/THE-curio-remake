import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({});

/**
 * Returns the bucket name from environment
 */
function getBucketName(): string {
  return process.env.AI_TUTOR_STORAGE_BUCKET_NAME || process.env.AWS_BUCKET_NAME || process.env.BUCKET_NAME || '';
}

/**
 * Uploads a generated image to S3
 * @param imageBuffer - The image buffer to upload
 * @param contentType - MIME type (default: 'image/png')
 * @returns The S3 URL (s3://bucket/key)
 */
export async function uploadGeneratedImageToS3(
  imageBuffer: Buffer,
  contentType: string = 'image/png'
): Promise<string> {
  const bucketName = getBucketName();
  if (!bucketName) {
    throw new Error('Bucket name is not set');
  }

  // Generate UUID filename
  const filename = `${uuidv4()}.png`;
  const key = `generated-images/${filename}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: imageBuffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  return `s3://${bucketName}/${key}`;
}

