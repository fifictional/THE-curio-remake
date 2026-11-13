import fetch from 'node-fetch';

const mutation = `
  mutation UpdateDocument($input: UpdateDocumentInput!) {
    updateDocument(input: $input) {
      documentUuid
      userUuid
      spaceUuid
      key
      fileName
      type
      createdAt
      updatedAt
      youtubeVideoUuid
      flashcardDeckUuid
      subjectId
      documentSummaries {
        items {
          documentSummaryUuid
          tags
        }
      }
    }
  }
`;

export const updateDocument = async (documentUuid: string, input?: { subjectId?: string }) => {
  if (!process.env.APPSYNC_URL || !process.env.APPSYNC_API_KEY) {
    throw new Error('APPSYNC_URL or APPSYNC_API_KEY is not set');
  }

  const updateInput: { documentUuid: string; subjectId?: string } = {
    documentUuid: documentUuid,
  };
  
  if (input?.subjectId !== undefined) {
    updateInput.subjectId = input.subjectId;
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
        input: updateInput,
      },
    }),
  });

  const responseData = await response.json();
  console.log('Update document', responseData);

  if (!response.ok) {
    throw new Error('Failed to update task');
  }
};