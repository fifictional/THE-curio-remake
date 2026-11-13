import fetch from 'node-fetch';
import { VisionOutputItem } from './update-document-layout';

const query = `
  query GetDocumentVisionOutputsByDocumentUuid($documentUuid: ID!, $nextToken: String) {
    listDocumentVisionOutputs(filter: { documentUuid: { eq: $documentUuid } }, nextToken: $nextToken, limit: 1000) {
      items {
        documentVisionOutputUuid
        documentUuid
        totalPages
        pageNumber
        bbox
        className
        confidence
        caption
        text
      }
      nextToken
    }
  }
`;

export const getDocumentLayout = async (documentUuid: string) => {
  if (!process.env.APPSYNC_URL || !process.env.APPSYNC_API_KEY) {
    throw new Error('APPSYNC_URL or APPSYNC_API_KEY is not set');
  }

  const allItems: VisionOutputItem[] = [];
  let nextToken: string | undefined = undefined;

  do {
    const response = await fetch(process.env.APPSYNC_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.APPSYNC_API_KEY!,
      },
      body: JSON.stringify({
        query: query,
        variables: {
          documentUuid,
          nextToken,
        },
      }),
    });

    const result = await response.json() as {
      data?: { listDocumentVisionOutputs: { items: VisionOutputItem[]; nextToken?: string } };
      errors?: { message: string }[];
    };

    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      throw new Error('Failed to fetch document vision outputs');
    }

    if (result.data?.listDocumentVisionOutputs?.items) {
      allItems.push(...result.data.listDocumentVisionOutputs.items);
    }

    nextToken = result.data?.listDocumentVisionOutputs?.nextToken;
  } while (nextToken);

  console.log(`Fetched ${allItems.length} total layout items for document ${documentUuid}`);
  return allItems;
};