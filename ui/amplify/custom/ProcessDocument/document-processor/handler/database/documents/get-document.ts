import fetch from 'node-fetch';
import { GetDocumentResponse } from '../../core/types';

const query = `
  query GetDocument($id: ID!) {
    getDocument(documentUuid: $id) {
      documentUuid
      key
      userUuid
      spaceUuid
      originalKey
      fileName
      type
      documentCount
      youtubeVideoUuid
    }
  }
`;

export const getDocument = async (documentUuid: string) => {
  if (!process.env.APPSYNC_URL || !process.env.APPSYNC_API_KEY) {
    throw new Error('APPSYNC_URL or APPSYNC_API_KEY is not set');
  }

  const response = await fetch(process.env.APPSYNC_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.APPSYNC_API_KEY!,
    },
    body: JSON.stringify({
      query: query,
      variables: {
        id: documentUuid,
      },
    }),
  });

  const data = await response.json() as {
    data?: { getDocument: GetDocumentResponse };
    errors?: Array<{ errorType?: string; message?: string; path?: (string | number)[] }>;
  };

  // Throw on GraphQL errors (e.g. Unauthorized) so SQS retries/DLQs instead of
  // silently treating an auth failure as "document not found".
  if (data.errors && data.errors.length > 0) {
    const primary = data.errors[0];
    throw new Error(
      `getDocument AppSync error (${primary.errorType ?? 'Unknown'}): ${primary.message ?? 'no message'}`
    );
  }

  return data.data?.getDocument;
};