import { YoutubeViewer } from "../youtube-viewer";
import { useCoreContext } from "@/providers/core-provider";

export function YoutubeViewerAsTab() {
  const { document } = useCoreContext();

  if (!document) {
    return <div>Loading Video...</div>;
  }

  return <YoutubeViewer youtubeVideoUuid={document?.youtubeVideoUuid || ''} />;
}