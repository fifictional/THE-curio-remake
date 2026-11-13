import mixpanel from 'mixpanel-browser';

/** Browser Mixpanel API host from `NEXT_PUBLIC_MIXPANEL_API_HOST` (e.g. `https://api-eu.mixpanel.com`). */
export function getMixpanelBrowserInitOptions(): { api_host: string } | undefined {
  const apiHost = process.env.NEXT_PUBLIC_MIXPANEL_API_HOST?.trim();
  return apiHost ? { api_host: apiHost } : undefined;
}

let browserInitialized = false;

/** Idempotent init — safe for direct `mixpanel-browser` imports outside MixpanelAnalytics. */
export function ensureMixpanelBrowserInitialized(token?: string): void {
  const mixpanelToken = token ?? process.env.NEXT_PUBLIC_MIXPANEL_TOKEN ?? '';
  if (browserInitialized || !mixpanelToken) {
    return;
  }

  mixpanel.init(mixpanelToken, {
    debug: false,
    ...getMixpanelBrowserInitOptions(),
  });
  browserInitialized = true;
}

export function trackMixpanelBrowserEvent(
  event: string,
  properties?: Record<string, unknown>,
): void {
  ensureMixpanelBrowserInitialized();
  mixpanel.track(event, properties);
}
