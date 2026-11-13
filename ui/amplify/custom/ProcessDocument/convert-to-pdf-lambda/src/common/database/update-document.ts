import fetch from 'node-fetch';

const mutation = `
  mutation UpdateDocument($input: UpdateDocumentInput!) {
    updateDocument(input: $input) {
      documentUuid
      userUuid
      spaceUuid
      key
      originalKey
      fileName
      documentCount
      type
      createdAt
      updatedAt
      youtubeVideoUuid
      documentSummaries {
        items {
          documentSummaryUuid
          tags
        }
      }
    }
  }
`;

export const updateDocument = async (documentUuid: string, input: {
  key: string;
}) => {
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
      query: mutation,
      variables: {
        input: {
          documentUuid: documentUuid,
          key: input.key,
        },
      },
    }),
  });

  const responseData = await response.json();
  console.log('Update document', responseData);

  if (!response.ok) {
    throw new Error('Failed to update task');
  }
};