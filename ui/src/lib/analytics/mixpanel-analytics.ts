import mixpanel from 'mixpanel-browser';
import { Analytics, AnalyticsPropertyValue, AnalyticsUser } from './types';
import { ensureMixpanelBrowserInitialized } from './mixpanel-env';

export class MixpanelAnalytics implements Analytics {
  constructor() {
    this.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || '');
  }

  init(token: string) {
    ensureMixpanelBrowserInitialized(token);
  }

  identify(userId: string) {
    mixpanel.identify(userId);
  }

  track(event: string, properties?: Record<string, AnalyticsPropertyValue>) {
    mixpanel.track(event, properties);
  }

  people = {
    set: (properties: Partial<AnalyticsUser>) => {
      mixpanel.people.set(properties);
    },
  };

  reset() {
    mixpanel.reset();
  }
} 