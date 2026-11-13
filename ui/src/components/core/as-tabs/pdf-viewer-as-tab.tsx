import { useDocumentUrlApi } from "@/hooks/api/documents";
import { PDFViewer } from "../pdf-viewer";
import { useCoreContext } from "@/providers/core-provider";
import { LoadingSpinnerWithType } from "@/components/ui/loading-spinner-with-type";

export function PDFViewerAsTab() {
  const { document } = useCoreContext();
  const documentUrl = useDocumentUrlApi(document?.key || '');

  const type = document?.type;

  if (!documentUrl) {
    return <LoadingSpinnerWithType type={type as 'pdf' | 'image' | 'video'} />;
  }

  return <PDFViewer url={documentUrl} type={type as 'pdf' | 'image' | 'video'} />;
}
