import { cookieBasedClient } from "@ssr/utils/request-helper";
import { v4 as uuidv4 } from "uuid";

/**
 * Create a Metadata entry when a document is uploaded
 */
export async function createDocumentAnalytics(documentUuid: string, documentType: string) {
  const now = new Date().toISOString();
  
  try {
    const metadata = await cookieBasedClient.models.Metadata.create({
      metadataUuid: uuidv4(),
      targetUuid: documentUuid,
      targetType: 'document',
      name: 'uploadTime',
      value: now,
      createdAt: now,
      updatedAt: now,
    });

    await cookieBasedClient.models.Metadata.create({
      metadataUuid: uuidv4(),
      targetUuid: documentUuid,
      targetType: 'document',
      name: 'documentType',
      value: documentType,
      createdAt: now,
      updatedAt: now,
    });

    if (metadata.errors) {
      console.error('[createDocumentAnalytics] Error creating metadata:', metadata.errors);
      // Don't throw - analytics is not critical for document creation
      return null;
    }

    return metadata.data;
  } catch (error) {
    console.error('[createDocumentAnalytics] Error creating metadata:', error);
    // Don't throw - analytics is not critical for document creation
    return null;
  }
}

