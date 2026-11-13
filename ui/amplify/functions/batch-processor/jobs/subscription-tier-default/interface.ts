/**
 * Subscription Tier Default Job
 * 
 * Creator: Scans CurioSubscription table and emits subscriptionId for every entry missing the tier field
 * Mutator: Updates each subscription entry with tier = 'super'
 */

export const JOB_NAME = "subscription-tier-default";

export type SubscriptionTierDefaultJob = {
  subscriptionId: string;
};

