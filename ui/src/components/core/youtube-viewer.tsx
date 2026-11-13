'use client';
import { useYoutubeVideoUrlApi } from '@/hooks/api/use-youtube-video-url.api';
import YouTube from 'react-youtube';

export const YoutubeViewer = ({ youtubeVideoUuid }: { youtubeVideoUuid: string }) => {
  // get youtube video url from api
  const { youtubeVideoId, isLoading, error } = useYoutubeVideoUrlApi(youtubeVideoUuid);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="w-full max-w-full aspect-video">
        <YouTube
          videoId={youtubeVideoId}
          className="w-full h-full"
          opts={{
            width: '100%',
            height: '100%',
            playerVars: {
              rel: 0,
              modestbranding: 1,
            },
          }}
        />
      </div>
    </div>
  );
};