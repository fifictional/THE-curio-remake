import { CurioLoadingWithSearch } from "@/components/ui/curio-loading-search";
import { DocumentSummary } from "../document-summary";
import { useCoreContext } from "@/providers/core-provider";
import { useLoadingMessage } from "@/hooks/use-loading-message";

export function DocumentSummaryAsTab() {
  const { documentSummary } = useCoreContext();
  const documentSummaryNotCreatedYet = !documentSummary;
  const { message } = useLoadingMessage();
  
  // isLoading is now determined by status in DocumentSummary component itself
  // Pass false since status is checked internally

  if (documentSummaryNotCreatedYet) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <CurioLoadingWithSearch message={message} />
      </div>
    );
  }  
  return <DocumentSummary documentSummary={documentSummary} />;
}