import { NextRequest, NextResponse } from 'next/server';
import { FetchYoutubeVideo } from '@/lib/ssr/data/yt';

// this will handle both youtube.com/watch?v=$videoId and youtu.be/$videoId
// use a regex to extract the video id
// www.youtube.com/watch?v=dQw4w9WgXcQ&ab_channel=RickAstley
// www.youtube.com/shorts/dQw4w9WgXcQ?feature=share
// www.youtube.com/live/dQw4w9WgXcQ?feature=share
// www.youtube.com/shorts/dQw4w9WgXcQ?feature=share&ab_channel=RickAstley
// www.youtu.be/dQw4w9WgXcQ?feature=share&ab_channel=RickAstley
const regex = /(?:v=|\/shorts\/|\/live\/|be\/)([^&?]+)/;
const extractVideoId = (url: string) => {
  const videoId = url.match(regex)?.[1];
  if (!videoId) {
    return null;
  }
  return videoId;
};

export async function POST(request: NextRequest) {
  try {
    const youtubeVideo = await request.json() as FetchYoutubeVideo;
    
    if (!youtubeVideo) {
      return NextResponse.json(
        { error: 'No Youtube Video provided' },
        { status: 400 }
      );
    }

    const videoId = extractVideoId(youtubeVideo.videoUrl);
    console.log('videoId', videoId);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid Youtube Video URL' },
        { status: 400 }
      );
    }
    
    // call youtube api to get the title and thumbnail url
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;
    if (!youtubeApiKey) {
      throw new Error('YOUTUBE_API_KEY is not set');
    }
    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${youtubeApiKey}`);
    const data = await response.json();
    
    return NextResponse.json({
      videoId: data.items[0].id,
      title: data.items[0].snippet.title,
      thumbnailUrl: data.items[0].snippet.thumbnails.default.url,
      success: true,
    });

  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
