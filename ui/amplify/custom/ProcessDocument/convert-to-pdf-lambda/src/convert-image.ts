import { Logger } from "@aws-lambda-powertools/logger";
import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { StudentDocument } from "./common/types";
import { updateDocument } from "./common/database/update-document";
import { PDFDocument } from "pdf-lib";

type FileStructure = {
  name: string;
  type: string;
  content: Uint8Array;
}

async function downloadFile(s3Key: string, s3Client: S3Client): Promise<Uint8Array> {
  const fileContent = await s3Client.send(new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: s3Key,
  }));

  const bytes = await fileContent.Body?.transformToByteArray();
  if (!bytes) {
    throw new Error('Failed to download file from S3');
  }
  return bytes;
}

async function getFileContentType(s3Key: string, s3Client: S3Client): Promise<string | undefined> {
  const fileContent = await s3Client.send(new HeadObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: s3Key,
  }));
  return fileContent.ContentType;
}

async function convertImageToPdf(files: FileStructure[]): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.create();

    for (const file of files) {
      const imageBytes = file.content;
      const image = file.type.includes("jpeg") || file.type.includes("jpg")
        ? await pdfDoc.embedJpg(imageBytes)
        : await pdfDoc.embedPng(imageBytes);

      // use A4 size, but check if the image is landscape or portrait
      const ratio = image.width / image.height;
      const landscapeRatioThreshold = 1.4;
      const pageSize = ratio > landscapeRatioThreshold ? [841.89, 595.28] : [595.28, 841.89];

      // always use A4 size
      const page = pdfDoc.addPage(pageSize as [number, number]);
      const { width, height } = page.getSize();
      const scale = Math.min(width / image.width, height / image.height);

      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width * scale,
        height: image.height * scale,
      });
    }

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  } catch (error) {
    console.error(error);
    throw new Error('Error converting image to pdf');
  }
}

export async function convertImage(
  document: StudentDocument,
  logger: Logger,
  s3Client: S3Client
): Promise<{ document: StudentDocument }> {
  logger.info('File is an image', {
    s3Key: document.key,
  });

  // download all images from s3
  const files: FileStructure[] = [];
  logger.info('Downloading images from S3', {
    s3Key: document.originalKey,
    documentCount: document.documentCount,
  });

  // Extract folder path and file extension from originalKey
  // originalKey format: student-documents/{userUuid}/{documentUuid}/uploadedFile-0.jpg (or uploadedFile.jpg for single image)
  const folderPath = document.originalKey.split('/').slice(0, -1).join('/');
  const originalFileName = document.originalKey.split('/').pop() || '';
  // Extract extension from original filename (could be "uploadedFile-0.jpg" or "uploadedFile.jpg")
  const fileExtension = originalFileName.includes('.') 
    ? '.' + originalFileName.split('.').pop() 
    : '';
  
  for (let i = 0; i < document.documentCount; i++) {
    // Images are stored as: student-documents/{userUuid}/{documentUuid}/uploadedFile-{i}.{ext}
    const imageS3Key = `${folderPath}/uploadedFile-${i}${fileExtension}`;

    logger.info('Downloading image from S3', {
      s3Key: imageS3Key,
    });

    const contentType = await getFileContentType(imageS3Key, s3Client);
    logger.info('Content type', {
      contentType,
    });

    const fileContent = await downloadFile(imageS3Key, s3Client);
    logger.info('File downloaded from S3', {
      s3Key: imageS3Key,
    });

    const file: FileStructure = {
      name: imageS3Key,
      type: contentType ?? '',
      content: fileContent,
    }
    files.push(file);
  }

  logger.info('Converting images to PDF');

  const pdfFile = await convertImageToPdf(files);

  logger.info('PDF file created');

  // Upload PDF file to same folder as original images: userUuid/documentUuid/file.pdf
  // Original images stay at userUuid/documentUuid/{index}.{ext}
  const newS3Key = `${folderPath}/file.pdf`;

  logger.info('Uploading PDF file to S3', {
    s3Key: newS3Key,
  });

  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: newS3Key,
    Body: pdfFile,
    ContentType: 'application/pdf',
  }));

  // update document with new s3 key
  await updateDocument(document.documentUuid, {
    key: newS3Key,
  });

  logger.info('PDF file created', {
    s3Key: newS3Key,
  });

  document.key = newS3Key;

  return {
    document,
  };
}

