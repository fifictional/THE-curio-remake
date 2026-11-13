import { Logger } from "@aws-lambda-powertools/logger";
import { S3Client, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { StudentDocument } from "./common/types";
import { updateDocument } from "./common/database/update-document";
import { getDocument } from "./common/database/get-document";
import { convertYoutube } from "./convert-youtube";
import { convertImage } from "./convert-image";
import { convertOfficeDocument } from "./convert-office-document";

type HandlerEvent = {
  documentUuid: string;
}

const logger = new Logger({
  serviceName: 'convert-office-to-pdf',
  logLevel: 'INFO',
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
});

function isPdf(type: string) {
  // check if file is already a pdf
  return type.toLowerCase().includes('pdf')
}

function isYoutubeVideo(type: string) {
  return type.toLowerCase().includes('youtube');
}

function isImage(type: string) {
  return type.toLowerCase().includes('image');
}

function isOfficeDocument(type: string) {
  return type.toLowerCase().includes('office');
}

async function renameFileInSameFolder(originalS3Key: string, newFileName: string): Promise<string> {
  // Extract the folder path (everything except the filename)
  const folderPath = originalS3Key.split('/').slice(0, -1).join('/');
  const newS3Key = `${folderPath}/${newFileName}`;
  
  logger.info('Renaming file in same folder', {
    bucketName: process.env.AWS_BUCKET_NAME,
    copySource: `${process.env.AWS_BUCKET_NAME}/${originalS3Key}`,
    key: newS3Key,
  });
  
  // Copy the file to the new name
  await s3Client.send(new CopyObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: newS3Key,
    CopySource: `${process.env.AWS_BUCKET_NAME}/${originalS3Key}`,
  }));

  return newS3Key;
}

async function deleteOriginalFiles(document: StudentDocument): Promise<void> {
  const bucketName = process.env.AWS_BUCKET_NAME || '';
  const originalKey = document.originalKey;
  const key = document.key;
  const documentCount = document.documentCount || 1;

  if (!originalKey) {
    logger.info('No originalKey found, nothing to delete', { documentUuid: document.documentUuid });
    return;
  }

  // Don't delete if originalKey is the same as key (already renamed/processed)
  if (originalKey === key) {
    logger.info('originalKey matches key, nothing to delete', { 
      documentUuid: document.documentUuid,
      key: originalKey 
    });
    return;
  }

  // Delete the originalKey file
  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: bucketName,
      Key: originalKey,
    }));
    logger.info('Deleted original file', { key: originalKey });
  } catch (error) {
    // If file doesn't exist, that's okay - log and continue
    if (error instanceof Error && error.name === 'NoSuchKey') {
      logger.info('Original file already deleted', { key: originalKey });
    } else {
      logger.error('Error deleting original file', { key: originalKey, error });
      throw error;
    }
  }

  // For multi-image uploads, delete all uploadedFile-{i}.{ext} files
  if (documentCount > 1) {
    const folderPath = originalKey.split('/').slice(0, -1).join('/');
    const originalFileName = originalKey.split('/').pop() || '';
    const fileExtension = originalFileName.includes('.') 
      ? '.' + originalFileName.split('.').pop() 
      : '';

    // Delete uploadedFile-{i}.{ext} for i from 0 to documentCount-1
    for (let i = 0; i < documentCount; i++) {
      const imageS3Key = `${folderPath}/uploadedFile-${i}${fileExtension}`;
      
      // Skip if this is the same as originalKey (already deleted above)
      if (imageS3Key === originalKey) {
        continue;
      }

      try {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: bucketName,
          Key: imageS3Key,
        }));
        logger.info('Deleted uploaded file', { key: imageS3Key });
      } catch (error) {
        // If file doesn't exist, that's okay - log and continue
        if (error instanceof Error && error.name === 'NoSuchKey') {
          logger.info('Uploaded file already deleted', { key: imageS3Key });
        } else {
          logger.error('Error deleting uploaded file', { key: imageS3Key, error });
          // Don't throw - continue deleting other files
        }
      }
    }
  }

  logger.info('Successfully deleted original files', { documentUuid: document.documentUuid });
}

export async function handler(event: HandlerEvent) {
  const { documentUuid } = event;
  if (!documentUuid) {
    throw new Error('documentUuid is required');
  }

  // Fetch document from database
  const documentData = await getDocument(documentUuid);
  if (!documentData) {
    throw new Error('Document not found');
  }

  // Convert to StudendDocument type
  const document: StudentDocument = {
    documentUuid: documentData.documentUuid,
    spaceUuid: documentData.spaceUuid,
    userUuid: documentData.userUuid,
    type: documentData.type,
    key: documentData.key,
    originalKey: documentData.originalKey,
    documentCount: documentData.documentCount,
    youtubeVideoUuid: documentData.youtubeVideoUuid,
  };

  // check if file needs conversion
  logger.info('Checking if file needs conversion', {
    type: document.type,
    documentUuid,
  });

  let resultDocument: StudentDocument;
  let documentUrl: string;

  // check if file is already a pdf and if it is, move it to the student documents folder
  if (isPdf(document.type)) {
    logger.info('File does not need conversion', {
      s3Key: document.originalKey,
    });

    // File is already a PDF, rename uploadedFile.pdf to file.pdf in the same folder
    const newS3Key = await renameFileInSameFolder(document.originalKey, 'file.pdf');
    
    // update document with new s3 key
    await updateDocument(document.documentUuid, {
      key: newS3Key,
    });

    document.key = newS3Key;
    resultDocument = { ...document, key: newS3Key };
    documentUrl = newS3Key;
  } else if (isYoutubeVideo(document.type)) {
    // check if file is a youtube video and if it is, convert the transcript to markdown
    const result = await convertYoutube(document, logger, s3Client);
    resultDocument = result.document;
    documentUrl = result.document.key;
  } else if (isImage(document.type)) {
    // check if file is an image and if it is, convert it to a pdf
    logger.info('File needs conversion', {
      s3Key: document.key,
    });
    const result = await convertImage(document, logger, s3Client);
    resultDocument = result.document;
    documentUrl = result.document.key;
  } else if (isOfficeDocument(document.type)) {
    const result = await convertOfficeDocument(document, logger, s3Client);
    resultDocument = result.document;
    documentUrl = result.document.key;
  } else {
    logger.error('File is not an image or office document', {
      s3Key: document.key,
    });
    throw new Error('File type is not supported');
  }

  // Delete original files after conversion is complete
  try {
    await deleteOriginalFiles(resultDocument);
  } catch (error) {
    // This is a cleanup step, so we don't want to fail the entire pipeline
    // Log the error but continue
    logger.error('Error deleting original files (non-fatal)', { 
      documentUuid, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }

  // Return documentUrl for use by other stages
  return { documentUrl, documentCount: document.documentCount, documentType: document.type };
}
