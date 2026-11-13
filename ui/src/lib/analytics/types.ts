export interface AnalyticsUser {
  $last_login: Date;
  $last_seen: Date;
  [key: string]: Date | string | number | boolean;
}

export type AnalyticsPrimitive = string | number | boolean | null;
export type AnalyticsPropertyValue =
  | AnalyticsPrimitive
  | AnalyticsPrimitive[];

export interface Analytics {
  init(token: string): void;
  identify(userId: string): void;
  track(event: string, properties?: Record<string, AnalyticsPropertyValue>): void;
  people: {
    set(properties: Partial<AnalyticsUser>): void;
  };
  reset(): void;
} 