export type SubscriptionType = 'none' | 'create' | 'delete' | 'update' | 'all';

export type ByUserApiOptions = {
  perPage?: number;
  subscriptions?: SubscriptionType;
  key?: string;
}