import fetch from 'node-fetch';
import { GetDocumentSummaryResponse } from '../../core/types';

const query = `
  query GetDocumentSummary($documentUuid: ID!) {
    listDocumentSummaryByDocumentUuid(documentUuid: $documentUuid) {
      items {
        documentSummaryUuid
        documentUuid
        title
        summary
        tags
        keyConcepts
        markdown
        enrichedMarkdown
      }
    }
  }
`;

export const getDocumentSummary = async (documentUuid: string) => {
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
        documentUuid: documentUuid,
      },
    }),
  });

  console.log('response', response);
  const data = await response.json() as { data?: { listDocumentSummaryByDocumentUuid: { items: GetDocumentSummaryResponse[] } } };
  console.log('data', data);
  return data.data?.listDocumentSummaryByDocumentUuid.items[0];
};