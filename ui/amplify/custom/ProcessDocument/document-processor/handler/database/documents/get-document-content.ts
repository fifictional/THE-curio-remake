import fetch from 'node-fetch';

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

export const getDocumentContent = async (documentUuid: string) => {
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

  const result = await response.json() as {
    data?: { listDocumentSummaryByDocumentUuid: { items: any[] } };
    errors?: { message: string }[];
  };

  if (result.errors) {
    console.error('GraphQL errors:', result.errors);
    throw new Error('Failed to fetch document summary');
  }

  return result.data?.listDocumentSummaryByDocumentUuid?.items;
};

// Convenience functions for specific use cases
export const getDocumentMarkdown = async (documentUuid: string) => {
  const items = await getDocumentContent(documentUuid);
  return items?.[0]?.markdown;
};

export const getDocumentEnrichedMarkdown = async (documentUuid: string) => {
  const items = await getDocumentContent(documentUuid);
  return items?.[0]?.enrichedMarkdown;
};