import { Analytics, AnalyticsPropertyValue, AnalyticsUser } from './types';

export class ConsoleAnalytics implements Analytics {
  init(token: string) {
    console.log('🔍 Analytics initialized with token:', token);
  }

  identify(userId: string) {
    console.log('👤 User identified:', userId);
  }

  track(event: string, properties?: Record<string, AnalyticsPropertyValue>) {
    console.log('📊 Event tracked:', event, properties);
  }

  people = {
    set: (properties: Partial<AnalyticsUser>) => {
      console.log('👥 User properties set:', properties);
    },
  };

  reset() {
    console.log('🔄 Analytics reset');
  }
} 