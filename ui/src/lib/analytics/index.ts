import { Analytics } from './types';
import { ConsoleAnalytics } from './console-analytics';
import { MixpanelAnalytics } from './mixpanel-analytics';

let analyticsService: Analytics | null = null;

export function getAnalyticsService(): Analytics {
  if (analyticsService) return analyticsService;

  if (process.env.NODE_ENV === 'development') {
    analyticsService = new ConsoleAnalytics();
  } else {
    analyticsService = new MixpanelAnalytics();
  }

  return analyticsService;
}

// Export a singleton instance
export const analytics = getAnalyticsService(); 