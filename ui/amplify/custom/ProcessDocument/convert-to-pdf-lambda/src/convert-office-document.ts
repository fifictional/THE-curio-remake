import { Logger } from "@aws-lambda-powertools/logger";
import { S3Client, PutObjectCommand, GetObjectCommand, GetObjectCommandOutput } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import { createWriteStream } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { StudentDocument } from "./common/types";
import { updateDocument } from "./common/database/update-document";

async function downloadFile(s3Key: string, s3Client: S3Client): Promise<Readable> {
  const fileContent: GetObjectCommandOutput = await s3Client.send(new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: s3Key,
  }));

  if (!fileContent.Body) {
    throw new Error('File body is empty');
  }

  return fileContent.Body as Readable;
}

export async function convertOfficeDocument(
  document: StudentDocument,
  logger: Logger,
  s3Client: S3Client
): Promise<{ document: StudentDocument }> {
  logger.info('File is an office document', {
    s3Key: document.originalKey,
  });

  // download file from s3
  const fileContent = await downloadFile(document.originalKey, s3Client);
  logger.info('File downloaded from S3', {
    s3Key: document.originalKey,
  });

  // write file to local filesystem
  logger.info('Writing file to local filesystem', {
    s3Key: document.originalKey,
  });
  const fileName = document.originalKey.split('/').pop() ?? '';
  const filePath = path.join('/tmp', fileName);
  await new Promise((resolve, reject) => {
    const writeStream = createWriteStream(filePath);
    
    writeStream.on('finish', () => {
      logger.info('File written to local filesystem', {
        s3Key: document.originalKey,
        position: filePath,
      });
      resolve(true);
    });
    
    writeStream.on('error', (error) => {
      reject(error);
    });

    fileContent.pipe(writeStream);
    
    fileContent.on('error', (error) => {
      writeStream.destroy(error);
      reject(error);
    });
  });

  // check file exists
  if (!fs.existsSync(filePath)) {
    logger.error('File does not exist', {
      s3Key: document.originalKey,
      position: filePath,
    });
    throw new Error('File does not exist');
  }

  // log all content of the /tmp folder
  logger.info('Content of /tmp folder', {
    content: fs.readdirSync('/tmp').join(', '),
  });

  logger.info('Converting file to PDF', {
    fileName,
  });

  // convert file to pdf
  execSync(`
  cd /tmp
  libreoffice7.6 --headless --invisible --nodefault --view --nolockcheck --nologo --norestore --convert-to pdf --outdir /tmp ./${fileName}
  `, {
    stdio: 'inherit',
  });

  // log all content of the /tmp folder
  logger.info('Content of /tmp folder', {
    content: fs.readdirSync('/tmp').join(', '),
  });

  // Upload PDF file to same folder as original: userUuid/documentUuid/file.pdf
  // Original office doc stays at userUuid/documentUuid/uploadedFile.{ext}
  const folderPath = document.originalKey.split('/').slice(0, -1).join('/');
  const newS3Key = `${folderPath}/file.pdf`;

  logger.info('Uploading PDF file to S3', {
    s3Key: newS3Key,
  });

  const pdfFilePath = `/tmp/${fileName.replace(/\.[^/.]+$/, '')}.pdf`;

  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: newS3Key,
    Body: fs.readFileSync(pdfFilePath),
    ContentType: 'application/pdf',
  }));

  // update document with new s3 key
  await updateDocument(document.documentUuid, {
    key: newS3Key,
  });

  document.key = newS3Key;

  return {
    document,
  };
}

