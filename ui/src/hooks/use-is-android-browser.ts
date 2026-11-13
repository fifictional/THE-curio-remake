import { useEffect, useState } from "react";

// Webview user agent pattern - matches the specific Chrome version used by the mobile app webview
// Pattern: Chrome/120.0.6099.230 (the specific version used by the app)
const WEBVIEW_CHROME_VERSION = "Chrome/120.0.6099.230";

export function useIsAndroidBrowser() {
  const [isAndroidBrowser, setIsAndroidBrowser] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const userAgent = navigator.userAgent;
    
    // Check if it's Android
    const isAndroid = /Android/i.test(userAgent);
    
    // Exclude webview by checking for the specific Chrome version used by the app
    // The webview uses Chrome/120.0.6099.230, so if we see this exact version, it's the webview
    const isWebview = userAgent.includes(WEBVIEW_CHROME_VERSION);
    
    // Also check for common webview indicators
    const hasWebviewIndicators = userAgent.includes('wv'); // Some webviews include 'wv' in the user agent
    
    const isNotWebview = !isWebview && !hasWebviewIndicators;
    
    // Debug logging
    if (isAndroid) {
      console.log('[useIsAndroidBrowser] Android detected', {
        userAgent,
        isWebview,
        hasWebviewIndicators,
        isNotWebview,
        willShowBanner: isAndroid && isNotWebview,
      });
    }
    
    setIsAndroidBrowser(isAndroid && isNotWebview);
  }, []);

  return { isAndroidBrowser };
}

