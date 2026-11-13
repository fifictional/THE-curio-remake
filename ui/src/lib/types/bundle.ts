export type Bundle = {
  bundleUuid: string;
  name: string;
  description?: string;
  order: number;
  defaultSku?: string | null;
  additionalSkus?: string[] | null;
  modules: string[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type BundleSkuPair = {
  provider: string;
  id: string;
};

export type BundleFormType = {
  name: string;
  description?: string;
  order: number;
  skuDefault: string;
  skuAdditional: BundleSkuPair[];
  modules: string[];
  published: boolean;
};

export type PublicBundle = Omit<Bundle, 'createdAt' | 'updatedAt' | 'publishedAt' | 'createdBy' | 'updatedBy'>;

export type BundlePurchaseSource = 'manual' | 'stripe' | 'paddle' | 'google' | 'apple' | 'other';

export type Purchase = {
  userId: string;
  bundleUuid: string;
  purchasedAt: string;
  source: BundlePurchaseSource;
  receiptId?: string | null;
  revokedAt?: string | null;
  revokedBy?: string | null;
  revokeReason?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Receipt = {
  receiptId: string;
  userId: string;
  provider: BundlePurchaseSource;
  payload?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};
