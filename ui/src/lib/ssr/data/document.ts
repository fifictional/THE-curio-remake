import { cookieBasedClient } from "@ssr/utils/request-helper";
import { createDocumentAnalytics } from "./document-analytics";

export type StoreDocument = {
  originalKey: string,
  documentUuid: string,
  type: string,
  fileName: string,
  documentCount: number,
  spaceUuid?: string | null,
}

export async function createDocument(userUuid: string, document: StoreDocument, spaceUuid?: string | null) {
  const now = new Date().toISOString();
  const createdDocument = await cookieBasedClient.models.Document.create({
    documentUuid: document.documentUuid,
    userUuid: userUuid,
    type: document.type,
    key: '',
    originalKey: document.originalKey,
    fileName: document.fileName,
    documentCount: document.documentCount,
    spaceUuid: spaceUuid,
    createdAt: now,
    updatedAt: now,
  });

  if (createdDocument.errors) {
    throw new Error(createdDocument.errors[0].message);
  }

  if (!createdDocument.data) {
    throw new Error('Failed to create document');
  }

  console.log('creating document analytics', {
    documentUuid: document.documentUuid,
    documentType: document.type,
  });

  // Create analytics entry (don't fail if this fails)
  // document type should be 'pdf' or 'office' or 'image' or 'other'
  // documens is the mime type of the document so application/pdf is pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document is office, image/png is image, and other is other
  const documentType = document.type === 'application/pdf' ? 'pdf' : document.type.includes('office') ? 'office' : document.type.includes('image/') ? 'image' : 'other';
  await createDocumentAnalytics(document.documentUuid, documentType).catch((error) => {
    console.error('[createDocument] Failed to create analytics entry:', error);
  });

  return createdDocument.data;
}