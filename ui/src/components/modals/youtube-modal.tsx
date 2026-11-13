import { Dialog, VisuallyHidden } from "@radix-ui/themes";
import { YoutubeVideo } from "../upload/youtube-video";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

interface YoutubeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceUuid: string;
  onUploadCompleted: ({ documentUuid }: { documentUuid: string }) => void;
  onUploadStarted: () => void;
  initialUrl?: string;
}

export const YoutubeModal = ({ open, onOpenChange, spaceUuid, onUploadCompleted, onUploadStarted, initialUrl }: YoutubeModalProps) => {
  const router = useRouter();

  const onUploadStartedWrapper = useCallback(() => {
    onUploadStarted();
    onOpenChange(false);
  }, [onOpenChange, onUploadStarted]);

  const onUploadCompletedWrapper = useCallback(({ documentUuid }: { documentUuid: string }) => {
    if (spaceUuid) {
      router.push(`/spaces/${spaceUuid}/documents/${documentUuid}`);
    } else {
      router.push(`/documents/${documentUuid}`);
    }

    onUploadCompleted({ documentUuid });
  }, [onUploadCompleted]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <VisuallyHidden>
        <Dialog.Title>Youtube Study</Dialog.Title>
      </VisuallyHidden>
      <Dialog.Content aria-describedby='youtube-modal' style={{ maxWidth: '900px', maxHeight: '800px' } as React.CSSProperties}>
        <YoutubeVideo initialUrl={initialUrl} spaceUuid={spaceUuid} onUploadCompleted={onUploadCompletedWrapper} onUploadStarted={onUploadStartedWrapper} />  
      </Dialog.Content>
    </Dialog.Root>
  );
};