import { Analytics } from './types';
import { ConsoleAnalytics } from './console-analytics';
import { MixpanelAnalytics } from './mixpanel-analytics';

let analyticsService: Analytics | null = null;

export function getAnalyticsService(): Analytics {
  if (analyticsService) return analyticsService;

  // Without a token Mixpanel's browser client is never initialised, and every
  // track() throws (`disable_all_events`), which broke hydration in a production
  // build. Fall back to console analytics whenever there is no token.
  const hasMixpanelToken = Boolean(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN);
  if (process.env.NODE_ENV === 'development' || !hasMixpanelToken) {
    analyticsService = new ConsoleAnalytics();
  } else {
    analyticsService = new MixpanelAnalytics();
  }

  return analyticsService;
}

// Export a singleton instance
export const analytics = getAnalyticsService(); 