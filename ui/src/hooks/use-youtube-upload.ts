import { useCommonContext, useAnalytics } from "@/providers";
import { useCallback, useState } from "react";

export const isValidYoutubeUrl = (url: string) => {
  return url.includes('youtube.com/watch?v=') || url.includes('youtu.be/') || url.includes('youtube.com/shorts/') || url.includes('youtube.com/live/');
}

const startUpload = async ({
  videoId,
  title,
  thumbnailUrl,
  spaceUuid,
}: {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  spaceUuid: string;
}) => {
  // start the video analysis
 return await fetch('/api/yt/store', {
   method: 'POST',
   body: JSON.stringify({
     videoId,
     title,
     thumbnailUrl,
     spaceUuid,
   }),
 });
};

interface UseYoutubeUploadProps {
  spaceUuid: string;
  onYoutubeVideoUploaded: ({ documentUuid }: { documentUuid: string }) => void;
  onUploadStarted: () => void;
}

export const useYoutubeUpload = ({ spaceUuid, onYoutubeVideoUploaded, onUploadStarted }: UseYoutubeUploadProps) => {
  const { track } = useAnalytics();
  const [startError, setStartError] = useState<string | null>(null);
  const [youtubeVideo, setYoutubeVideo] = useState<{
    videoId: string;
    title: string;
    thumbnailUrl: string;
  } | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { addInProgressUpload, removeInProgressUpload } = useCommonContext();

  const handleOnChangeYoutubeUrl = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setVideoUrl(e.target.value);

    if (e.target.value.length === 0) {
      setFetchError(null);
      return;
    }

    if (isValidYoutubeUrl(e.target.value)) {
      fetchYoutubeVideo(e.target.value);
    } else {
      setFetchError('Please enter a valid YouTube video URL');
    }
  }, [track, spaceUuid]);

  const fetchYoutubeVideo = useCallback(async (url: string) => {
    setIsFetching(true);
    setFetchError(null);

    if (!isValidYoutubeUrl(url)) {
      track('youtube-url-invalid', {
        spaceUuid,
        videoUrl: url,
      });
      setFetchError('Please enter a valid YouTube video URL');
      setIsFetching(false);
      return;
    }
  
    const response = await fetch('/api/yt/fetch', {
      method: 'POST',
      body: JSON.stringify({
        videoUrl: url,
      }),
    });

    if (!response.ok) {
      track('youtube-fetch-failed', {
        spaceUuid,
        videoUrl: url,
      });
      setFetchError('Failed to fetch YouTube video');
      setIsFetching(false);
      return;
    }

    const data = await response.json();
    setYoutubeVideo(data);
    setIsFetching(false);
  }, [track, spaceUuid]);

  const handleCancel = useCallback(() => {
    track('youtube-cancel', {
      spaceUuid,
    });
    setYoutubeVideo(null);
    setVideoUrl(null);
  }, [track, spaceUuid]);

  const handleStart = useCallback(async () => {
    track('youtube-start', {
      spaceUuid,
    });
    setStartError(null);

    if (!youtubeVideo) {
      setStartError('Please select a video to start');
      return;
    }

    addInProgressUpload({
      files: [],
      key: '',
      originalKey: '',
      fileName: youtubeVideo.title,
      type: 'youtube',
      isUploading: true,
    });
    setYoutubeVideo(null);
    setVideoUrl(null);

    onUploadStarted();

    var response = await startUpload({
      videoId: youtubeVideo.videoId,
      title: youtubeVideo.title,
      thumbnailUrl: youtubeVideo.thumbnailUrl,
      spaceUuid
    });

    if (!response.ok) {
      track('youtube-start-failed', {
        spaceUuid,
        videoUrl: youtubeVideo.title,
      });
      setStartError('Failed to start upload');
    }

    const data = await response.json() as { youtubeVideoUuid: string, documentUuid: string };
    onYoutubeVideoUploaded({ documentUuid: data.documentUuid });

    removeInProgressUpload(youtubeVideo.title)
  }, [youtubeVideo, addInProgressUpload, track, spaceUuid]);

  return {
    youtubeVideo,
    videoUrl,
    handleOnChangeYoutubeUrl,
    isFetching,
    fetchError,
    handleCancel,
    handleStart,
    startError,
    isValidYoutubeUrl,
  }
}