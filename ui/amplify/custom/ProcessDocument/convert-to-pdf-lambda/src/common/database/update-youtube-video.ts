import fetch from 'node-fetch';

const mutation = `
  mutation UpdateYoutubeVideo($input: UpdateYoutubeVideoInput!) {
    updateYoutubeVideo(input: $input) {
      youtubeVideoUuid
      videoId
      title
      transcriptKey
      thumbnailUrl
    }
  }
`;

export const updateYoutubeVideo = async (youtubeVideoUuid: string, input: {
  transcriptKey: string;
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
          youtubeVideoUuid: youtubeVideoUuid,
          transcriptKey: input.transcriptKey,
        },
      },
    }),
  });

  const responseData = await response.json();
  console.log('Update youtube video', responseData);

  if (!response.ok) {
    throw new Error('Failed to update task');
  }
};