import fetch from 'node-fetch';
import { GetYoutubeVideoResponse } from '../../core/types';

const query = `
  query GetYoutubeVideo($id: ID!) {
    getYoutubeVideo(youtubeVideoUuid: $id) {
      youtubeVideoUuid
      videoId
      title
      transcriptKey
    }
  }
`;

export const getYoutubeVideo = async (youtubeVideoUuid: string) => {
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
        id: youtubeVideoUuid,
      },
    }),
  });

  const data = await response.json() as { data?: { getYoutubeVideo: GetYoutubeVideoResponse } };
  return data.data?.getYoutubeVideo;
};