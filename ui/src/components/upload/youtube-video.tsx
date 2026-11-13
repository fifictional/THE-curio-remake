import { Loader2 } from "lucide-react";
import { Input } from "../ui";
import { Button } from "../ui/button";
import { useYoutubeUpload } from "@/hooks/use-youtube-upload";
import { useSessionContext } from "@/providers";
import { useCallback, useEffect, useRef } from "react";

interface YoutubeVideoProps {
  spaceUuid: string;
  onUploadCompleted: ({ documentUuid }: { documentUuid: string }) => void;
  onUploadStarted: () => void;
  initialUrl?: string;
}

export const YoutubeVideo = ({ spaceUuid, onUploadCompleted, onUploadStarted, initialUrl }: YoutubeVideoProps) => {
  const onYoutubeVideoUploaded = useCallback(({ documentUuid }: { documentUuid: string }) => {
    onUploadCompleted({ documentUuid });
  }, [onUploadCompleted]);

  const {
    youtubeVideo,
    videoUrl,
    handleOnChangeYoutubeUrl,
    isFetching,
    fetchError,
    handleCancel,
    handleStart,
    startError,
  } = useYoutubeUpload({ spaceUuid, onYoutubeVideoUploaded, onUploadStarted })
  const { hasReachedDailyLimitForAnalysis } = useSessionContext();

  // If an initialUrl is provided, simulate typing it to enter existing flow once
  const initialAppliedRef = useRef(false);
  useEffect(() => {
    if (initialAppliedRef.current) return;
    if (!youtubeVideo && initialUrl && !videoUrl) {
      initialAppliedRef.current = true;
      handleOnChangeYoutubeUrl({ target: { value: initialUrl } } as unknown as React.ChangeEvent<HTMLInputElement>);
    }
  }, [initialUrl, youtubeVideo, videoUrl, handleOnChangeYoutubeUrl]);

  return (
    <div className="flex flex-col items-center justify-center">
      <h3 className="text-lg font-medium text-gray-600 mb-4 text-center">
        YouTube Study
      </h3>
      {youtubeVideo ? (
        <YoutubeVideoPreview 
          title={youtubeVideo.title}
          thumbnailUrl={youtubeVideo.thumbnailUrl}
          videoId={youtubeVideo.videoId}
          handleCancel={handleCancel}
          handleStart={handleStart}
          startError={startError}
        />
      ) : (
      <YoutubeVideoForm 
        hasReachedDailyLimitForAnalysis={hasReachedDailyLimitForAnalysis}
        disabled={hasReachedDailyLimitForAnalysis}
        videoUrl={videoUrl || ''}
        handleOnChangeYoutubeUrl={handleOnChangeYoutubeUrl}
        fetchError={fetchError}
        isFetching={isFetching}
      />
      )}
    </div>
  );
};

const YoutubeVideoForm = ({ 
  videoUrl,
  handleOnChangeYoutubeUrl,
  fetchError,
  isFetching,
  disabled,
  hasReachedDailyLimitForAnalysis,
}: {
  videoUrl: string;
  handleOnChangeYoutubeUrl: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fetchError: string | null;
  isFetching: boolean;
  disabled: boolean;
  hasReachedDailyLimitForAnalysis: boolean;
}) => {
  return (
    <div className="flex flex-col items-center justify-center relative w-full">
      <Input
        placeholder="https://www.youtube.com/watch?v=5_KObyprYrY"
        className="w-full placeholder:text-focus-text"
        value={videoUrl || ''}
        onChange={handleOnChangeYoutubeUrl}
        disabled={isFetching || disabled}
      />
      {isFetching && (
        <div className="absolute right-2">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      )}
      {hasReachedDailyLimitForAnalysis && <p className="text-sm text-gray-600 mt-2 text-center">You've reached your daily limit for YouTube analysis.</p>}
      {fetchError && <p className="text-sm text-red-500 mt-2">{fetchError}</p>}
      </div>
  );
};

const YoutubeVideoPreview = ({ 
  title,
  thumbnailUrl,
  videoId,
  handleCancel,
  handleStart,
  startError,
 }: { 
  title: string;
  thumbnailUrl: string;
  videoId: string;
  handleCancel: () => void;
  handleStart: () => void;
  startError: string | null;
 }) => {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="flex flex-row items-center justify-center gap-4">
        <img src={thumbnailUrl} alt={title} className="h-20" style={{ filter: 'grayscale(100%)' }} />
        <p className="text-sm text-focus-text text-center">{title}</p>
      </div>
      <div className="flex flex-row gap-4 justify-between w-full">
        <Button 
          className="w-full mt-4 bg-red-400 text-white hover:bg-red-500/80" size="sm"
          onClick={handleCancel}
          disabled={!videoId}>
          Cancel
        </Button>
        <Button 
          className="w-full mt-4 bg-gray-700 text-white hover:bg-gray-800/80" size="sm"
          onClick={handleStart}
          disabled={!videoId}>
          Start
        </Button>
      </div>
      {startError && <p className="text-sm text-red-500 mt-2">{startError}</p>}
    </div>
  );
};