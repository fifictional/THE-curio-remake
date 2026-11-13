import { PDFDocument } from 'pdf-lib';
import { readFile } from 'fs/promises';

/**
 * Crops a rectangular region from a PDF page and returns a PDF buffer of the crop.
 * bbox format: [x_min, y_min, x_max, y_max] where values are in 0-1000 scale.
 * Padding is applied as a percentage of crop dimensions, with a minimum in points.
 */
export async function cropPdfRegion(
  pdfPath: string,
  pageNumber: number,
  boundingBox: number[],
  paddingPercent: number = 0.1,
  minPaddingPoints: number = 10,
): Promise<Buffer> {
  const pdfBuffer = await readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBuffer);

  const page = pdfDoc.getPage(pageNumber - 1);
  const { width: pageWidth, height: pageHeight } = page.getSize();

  const [x_min, y_min, x_max, y_max] = boundingBox;

  const x1_pdf = (x_min / 100) * pageWidth;
  const y1_pdf = pageHeight - (y_max / 100) * pageHeight;
  const x2_pdf = (x_max / 100) * pageWidth;
  const y2_pdf = pageHeight - (y_min / 100) * pageHeight;

  const cropWidth = (x2_pdf - x1_pdf);
  const cropHeight = (y2_pdf - y1_pdf);
  if (cropWidth <= 0 || cropHeight <= 0) {
    throw new Error(`Invalid crop dimensions: width=${cropWidth}, height=${cropHeight}`);
  }

  const paddingX = Math.max(minPaddingPoints, cropWidth * paddingPercent);
  const paddingY = Math.max(minPaddingPoints, cropHeight * paddingPercent);

  const croppedPdfDoc = await PDFDocument.create();
  const newPage = croppedPdfDoc.addPage([cropWidth + 2 * paddingX, cropHeight + 2 * paddingY]);

  const embeddedPage = await croppedPdfDoc.embedPage(page);
  newPage.drawPage(embeddedPage, {
    x: -x1_pdf + paddingX,
    y: -y1_pdf + paddingY,
    width: pageWidth,
    height: pageHeight,
  });

  const croppedPdfBytes = await croppedPdfDoc.save();
  return Buffer.from(croppedPdfBytes);
}

