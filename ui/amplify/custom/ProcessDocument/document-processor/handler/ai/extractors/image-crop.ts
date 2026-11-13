import { VisionOutputItem } from "../../database/documents/update-document-layout";
import { downloadDocument } from "../../database/documents/download-document";
import { readFile } from 'fs/promises';
import { PDFDocument } from 'pdf-lib';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export interface ImageCropInput {
    download_file_path: string;
    documentUuid: string;
    visionOutputs: VisionOutputItem[];
}

export interface CroppedImage {
    documentVisionOutputUuid: string;
    documentUuid: string;
    totalPages: number;
    pageNumber: number;
    className: string;
    confidence: number;
    bbox: string;
    croppedImagePath: string;
    croppedImageBuffer: Buffer;
    s3Key: string;
}

const s3Client = new S3Client({ region: process.env.AWS_REGION });

async function uploadToS3(buffer: Buffer, key: string, documentUuid: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `student-documents/${documentUuid}/${key}`,
    Body: buffer,
    ContentType: 'application/pdf',
  });

  await s3Client.send(command);
  return `s3://${process.env.AWS_BUCKET_NAME}/student-documents/${documentUuid}/${key}`;
}

export const callImageCropLambda = async (event: ImageCropInput): Promise<CroppedImage[]> => {
  const download_file_path = event.download_file_path;
  const documentUuid = event.documentUuid;
  const visionOutputs = event.visionOutputs;

  // Keep only LAYOUT_FIGURE and LAYOUT_TABLE from vision outputs
  const filteredVisionOutputs = visionOutputs.filter(output => 
    output.className === 'LAYOUT_FIGURE' || output.className === 'LAYOUT_TABLE'
  );

  const downloadedDocument = await downloadDocument(download_file_path, "document.pdf");
  const pdfBuffer = await readFile(downloadedDocument.path);

  // Load the PDF document using pdf-lib
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const croppedImages: CroppedImage[] = [];

  // Group vision outputs by page number
  const outputsByPage = new Map<number, VisionOutputItem[]>();
  for (const output of filteredVisionOutputs) {
    if (!outputsByPage.has(output.pageNumber)) {
      outputsByPage.set(output.pageNumber, []);
    }
    outputsByPage.get(output.pageNumber)!.push(output);
  }

  // Process each page
  for (const [pageNumber, pageOutputs] of outputsByPage) {
    const page = pdfDoc.getPage(pageNumber - 1); // pdf-lib uses 0-based indexing
    const { width, height } = page.getSize();

    for (const output of pageOutputs) {
      try {
        // Parse bounding box coordinates from the vision output
        const bbox = JSON.parse(output.bbox);
        const [left, top, right, bottom] = bbox;

        // Convert coordinates to PDF units (assuming coordinates are normalized 0-1)
        const cropX = left * width;
        const cropY = height - (bottom * height); // Flip Y coordinate
        const cropWidth = (right - left) * width;
        const cropHeight = (bottom - top) * height;

        // Create a new PDF document for the cropped region
        const croppedPdfDoc = await PDFDocument.create();

        // Create a new page with the crop dimensions
        const newPage = croppedPdfDoc.addPage([cropWidth, cropHeight]);

        // Embed the original page from the source document
        const embeddedPage = await croppedPdfDoc.embedPage(pdfDoc.getPage(pageNumber - 1));

        // Draw the embedded page onto the new page with transformation
        // The negative x and y values move the content so the crop region becomes the origin
        newPage.drawPage(embeddedPage, {
          x: -cropX,
          y: -cropY,
          width: width,
          height: height,
        });

        // Save the cropped PDF as bytes
        const croppedPdfBytes = await croppedPdfDoc.save();
        const croppedImageBuffer = Buffer.from(croppedPdfBytes);

        // Generate a unique path for the cropped image using vision output data
        const croppedImagePath = `student-documents/${documentUuid}/${output.documentVisionOutputUuid}.pdf`;

        // Upload to S3 using documentVisionOutputUuid as the key
        await uploadToS3(croppedImageBuffer, output.documentVisionOutputUuid, documentUuid);

        const croppedImage: CroppedImage = {
          documentVisionOutputUuid: output.documentVisionOutputUuid,
          documentUuid: output.documentUuid,
          totalPages: output.totalPages,
          pageNumber: output.pageNumber,
          className: output.className,
          confidence: output.confidence,
          bbox: output.bbox,
          croppedImagePath,
          croppedImageBuffer,
          s3Key: output.documentVisionOutputUuid
        };

        croppedImages.push(croppedImage);

        console.log(`Successfully cropped and uploaded: ${croppedImagePath}`);

      } catch (error) {
        console.error(`Error cropping image for output ${output.documentVisionOutputUuid}:`, error);
        // Continue processing other outputs even if one fails
      }
    }
  }

  console.log(`Successfully processed ${croppedImages.length} cropped images`);
  return croppedImages;
};