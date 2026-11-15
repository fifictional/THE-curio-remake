import { getUrl } from "@/lib/local-storage";
import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Resolve a signed URL for an S3 document.
 *
 * Pass `fallbackKey` (typically the `originalKey` of the document) so that
 * images and other docs that haven't finished backend processing yet — where
 * `key` is still an empty string — can still render from the originally
 * uploaded file instead of spinning forever.
 */
export function useDocumentUrlApi(documentKey: string, fallbackKey?: string) {
  const [url, setUrl] = useState<string | null>(null);

  const effectiveKey = documentKey || fallbackKey || "";

  useEffect(() => {
    if (!effectiveKey) return;

    let cancelled = false;
    getUrl({ path: effectiveKey })
      .then((result) => {
        if (!cancelled) setUrl(result.url.href);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[useDocumentUrlApi] getUrl failed", { effectiveKey, err });
        Sentry.captureException(err, {
          tags: { scope: "useDocumentUrlApi" },
          extra: { effectiveKey, documentKey, fallbackKey },
        });
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveKey]);

  return url;
}