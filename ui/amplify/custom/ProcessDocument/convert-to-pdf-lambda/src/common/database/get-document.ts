import fetch from 'node-fetch';

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

export interface GetDocumentResponse {
  documentUuid: string;
  key: string;
  userUuid: string;
  spaceUuid: string;
  originalKey: string;
  fileName: string;
  type: string;
  documentCount: number;
  youtubeVideoUuid?: string | null;
}

export const getDocument = async (documentUuid: string): Promise<GetDocumentResponse | null> => {
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

  const data = await response.json() as { data?: { getDocument: GetDocumentResponse } };
  return data.data?.getDocument || null;
};


