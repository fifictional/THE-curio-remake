import { useCoreContext } from "@/providers/core-provider";
import { getUrl } from "@/lib/local-storage";
import { useEffect, useState } from "react";

export function useReferenceUrlApi(referenceUrl?: string) {
  const [url, setUrl] = useState<string | null>(null);
  const { document } = useCoreContext();

  useEffect(() => {
    if (referenceUrl && document?.documentUuid) {
      // Use the same path structure as where files are stored
      const path = `student-documents/${document.documentUuid}/${referenceUrl}`;
      
      getUrl({ path }).then((urlResult) => {
        setUrl(urlResult.url.href);
      }).catch((error) => {
        console.error('useReferenceUrlApi: Error getting reference URL:', error);
        setUrl(null);
      });
    } else {
      setUrl(null);
    }
  }, [referenceUrl, document?.documentUuid]);

  return url;
} 