import { getUrl } from "@/lib/local-storage";
import { useEffect, useState } from "react";

export function useMockExamReferenceUrlApi(externalKey?: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (externalKey) {
      setLoading(true);
      setError(null);
      
      getUrl({ path: externalKey })
        .then((urlResult) => {
          setUrl(urlResult.url.href);
          setLoading(false);
        })
        .catch((error) => {
          console.error('useMockExamReferenceUrlApi: Error getting reference URL:', error);
          setError(error.message || 'Failed to load reference file');
          setUrl(null);
          setLoading(false);
        });
    } else {
      setUrl(null);
      setLoading(false);
      setError(null);
    }
  }, [externalKey]);

  return { url, loading, error };
}
