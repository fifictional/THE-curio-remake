import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export interface UploadResponse {
  success: boolean;
  file?: {
    originalKey: string;
    type: string;
  };
  error?: string;
}

const s3Client = new S3Client({});

/**
 * Uploads a file to S3 using AWS Amplify Storage
 * @param file - The file to upload
 * @param userUuid - User UUID for path organization
 * @param documentUuid - Document UUID for path organization
 * @param documentIndex - Optional index for multiple files (e.g., images)
 * @returns Promise<UploadResponse>
 */
export async function uploadDocumentToS3(
  file: File, 
  userUuid: string, 
  documentUuid: string, 
  documentIndex: number = -1
): Promise<UploadResponse> {
  // Get file extension from filename
  const fileExtension = file.name.split('.').pop() || '';
  const extension = fileExtension ? `.${fileExtension}` : '';
  
  // Build S3 key: student-documents/{userUuid}/{documentUuid}/uploadedFile.{ext} or {index}.{ext} for images
  let fileName: string;
  if (documentIndex >= 0) {
    fileName = `uploadedFile-${documentIndex}${extension}`;
  } else {
    fileName = `uploadedFile${extension}`;
  }
  
  const originalKey = `student-documents/${userUuid}/${documentUuid}/${fileName}`;
  
  const body = new Uint8Array(await file.arrayBuffer());
  const response = await s3Client.send(new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: originalKey,
    Body: body,
    ContentType: file.type,
    ContentLength: body.byteLength,
  }));

  if (!response) {
    throw new Error('Error uploading document');
  }

  return {
    success: true,
    file: {
      originalKey: originalKey,
      type: file.type,
    },
  };
}

/**
 * Uploads a file to S3 with a custom path
 * @param file - The file to upload
 * @param customPath - Custom S3 path
 * @returns Promise<UploadResponse>
 */
export async function uploadFileToS3WithCustomPath(
  file: File, 
  customPath: string
): Promise<UploadResponse> {
  console.log('process.env', process.env)
  console.log(`Uploading file to S3 with custom path: ${customPath}`);
  const body = new Uint8Array(await file.arrayBuffer());
  const response = await s3Client.send(new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: customPath,
    Body: body,
    ContentType: file.type,
    ContentLength: body.byteLength,
  }));

  console.log(`Uploaded file to S3 with custom path: ${customPath}`);

  if (!response) {
    throw new Error('Error uploading file');
  }

  return {
    success: true,
    file: {
      originalKey: customPath,
      type: file.type,
    },
  };
}

