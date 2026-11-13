import fetch from 'node-fetch';

const mutation = `
  mutation UpdateSpace($input: UpdateSpaceInput!) {
    updateSpace(input: $input) {
      spaceUuid
      userUuid
      name
      documents {
        items {
          userUuid
          spaceUuid
          documentUuid
          flashcards {
            items {
              flashcardUuid
              title
              content
            }
          }
          questions {
            items {
              questionUuid
              questionContent
              options
              answer
            }
          }
        }
      }
    }
  }
`;

export const updateSpace = async (spaceUuid: string) => {
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
          spaceUuid: spaceUuid,
        },
      },
    }),
  });

  const responseData = await response.json();
  console.log('Update space', responseData);

  if (!response.ok) {
    throw new Error('Failed to update space');
  }
};