import fetch from 'node-fetch';
import { getAppSyncConfig } from '@process-document/common/utils/appsync-config';

const mutation = `
  mutation UpdateDocument($input: UpdateDocumentInput!) {
    updateDocument(input: $input) {
      documentUuid
      userUuid
      spaceUuid
      key
      originalKey
      fileName
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
  const { url, apiKey } = await getAppSyncConfig();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
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