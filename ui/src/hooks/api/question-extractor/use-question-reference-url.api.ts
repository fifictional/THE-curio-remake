import { getUrl } from "aws-amplify/storage";
import { useEffect, useState, useRef } from "react";

// Cache for storing presigned URLs
const urlCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export function useQuestionReferenceUrl(s3Key?: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Abort any pending request when s3Key changes
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!s3Key) {
      setUrl(null);
      setIsLoading(false);
      return;
    }

    // Check cache first
    const cached = urlCache.get(s3Key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setUrl(cached.url);
      setIsLoading(false);
      return;
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const currentController = abortControllerRef.current;

    setIsLoading(true);
    getUrl({ path: s3Key })
      .then((urlResult) => {
        // Only update if this request wasn't aborted
        if (!currentController.signal.aborted) {
          const newUrl = urlResult.url.href;
          setUrl(newUrl);
          // Cache the URL
          urlCache.set(s3Key, { url: newUrl, timestamp: Date.now() });
          setIsLoading(false);
        }
      })
      .catch((error) => {
        if (!currentController.signal.aborted) {
          console.error('Error getting reference URL:', error);
          setUrl(null);
          setIsLoading(false);
        }
      });

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [s3Key]);

  return { url, isLoading };
}

