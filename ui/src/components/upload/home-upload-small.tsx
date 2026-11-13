import { useSessionContext } from "@/providers/session-provider";
import { ImageIcon, UploadIcon, YoutubeIcon } from "lucide-react";
import { useState } from "react";
import { UploadModal } from "../modals/upload-modal";
import { Button } from "../ui/button";
import { YoutubeModal } from "../modals/youtube-modal";
import { useCommonContext } from "@/providers/common-provider";

export const HomeUploadSmall = ({ defaultSpaceUuid, disabled, onDocumentUploadStarted }: { defaultSpaceUuid?: string, disabled: boolean, onDocumentUploadStarted: () => void }) => {
  const { userAttributes } = useSessionContext();
  const { isMobile } = useCommonContext();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isYoutubeModalOpen, setIsYoutubeModalOpen] = useState(false);
  const [mode, setMode] = useState<'all' | 'image' | 'pdf'>('all');
  
  return (
    <div className="flex flex-row gap-2">
      <Button 
        className="bg-gray-800 hover:bg-gray-800/80 flex gap-2
        disabled:opacity-50 disabled:cursor-not-allowed" size="sm"
        onClick={() => {
          setMode('pdf');
          setIsUploadModalOpen(true);
        }}
        disabled={disabled}
      >
        <UploadIcon className="h-4 w-4 flex-shrink-0" />
        {!isMobile && <span className="text-sm">Upload files</span>}
      </Button>
      <Button 
        className="bg-gray-800 hover:bg-gray-800/80 flex gap-2
        disabled:opacity-50 disabled:cursor-not-allowed" size="sm"
        onClick={() => {
          setMode('image');
          setIsUploadModalOpen(true);
        }}
        disabled={disabled}
      >
        <ImageIcon className="h-4 w-4 flex-shrink-0" />
        {!isMobile && <span className="text-sm">Upload images</span>}
      </Button>
      <Button 
        className="bg-gray-800 hover:bg-gray-800/80 flex gap-2
        disabled:opacity-50 disabled:cursor-not-allowed" size="sm"
        onClick={() => {
          setMode('pdf');
          setIsYoutubeModalOpen(true);
        }}
        disabled={disabled}
      >
        <YoutubeIcon className="h-4 w-4 flex-shrink-0" />
        {!isMobile && <span className="text-sm">Study from YouTube</span>}
      </Button>
      {/* <YoutubeVideo spaceUuid={defaultSpaceUuid || ''} /> */}
      <YoutubeModal open={isYoutubeModalOpen} onUploadCompleted={() => {}} onUploadStarted={onDocumentUploadStarted} onOpenChange={setIsYoutubeModalOpen} spaceUuid={defaultSpaceUuid || ''} />
      <UploadModal open={isUploadModalOpen} onUploadStarted={onDocumentUploadStarted} onOpenChange={setIsUploadModalOpen} userUuid={userAttributes?.userUuid || ''} mode={mode} />
    </div>
  );
};