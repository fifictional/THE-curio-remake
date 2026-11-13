// Paddle Price Preview API types

export interface PaddlePriceData {
  priceId: string;
  amount: string;
  currencyCode: string;
  formattedPrice: string;
}

export interface PaddlePricePreviewRequest {
  priceIds: string[];
  countryCode?: string;
  discountId?: string;
}

export interface PaddlePricePreviewResponse {
  prices: PaddlePriceData[];
}

// Paddle API response structure (from their API)

// Address structure
export interface PaddleApiAddress {
  postal_code: string;
  country_code: string;
}

// Totals structure (repeated pattern)
export interface PaddleApiTotals {
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
}

// Unit price structure
export interface PaddleApiUnitPrice {
  amount: string;
  currency_code: string;
}

// Unit price override structure
export interface PaddleApiUnitPriceOverride {
  country_codes: string[];
  unit_price: PaddleApiUnitPrice;
}

// Quantity constraints
export interface PaddleApiQuantity {
  minimum: number;
  maximum: number;
}

// Price object (detailed)
export interface PaddleApiPrice {
  id: string;
  description: string;
  type: string;
  name: string;
  product_id: string;
  billing_cycle: any | null;
  trial_period: any | null;
  tax_mode: string;
  unit_price: PaddleApiUnitPrice;
  unit_price_overrides: PaddleApiUnitPriceOverride[];
  custom_data: any | null;
  quantity: PaddleApiQuantity;
  status: string;
  created_at: string;
  updated_at: string;
  import_meta: any | null;
}

// Product object
export interface PaddleApiProduct {
  id: string;
  name: string;
  description: string;
  type: string;
  tax_category: string;
  image_url: string;
  custom_data: any | null;
  status: string;
  import_meta: any | null;
  created_at: string;
  updated_at: string;
}

// Line item (complete structure)
export interface PaddleApiLineItem {
  price: PaddleApiPrice;
  quantity: number;
  tax_rate: string;
  unit_totals: PaddleApiTotals;
  formatted_unit_totals: PaddleApiTotals;
  totals: PaddleApiTotals;
  formatted_totals: PaddleApiTotals;
  product: PaddleApiProduct;
  discounts: any[];
}

// Main response (complete structure)
export interface PaddleApiPricePreviewResponse {
  data: {
    customer_id: string | null;
    address_id: string | null;
    business_id: string | null;
    currency_code: string;
    address: PaddleApiAddress;
    customer_ip_address: string | null;
    discount_id: string | null;
    details: {
      line_items: PaddleApiLineItem[];
    };
    available_payment_methods: string[];
  };
  meta: {
    request_id: string;
  };
}

// Paddle Discount API types

export interface PaddleDiscountRequest {
  discountCodes: string[];
}

export interface PaddleDiscountData {
  code: string;
  discountId: string;
}

export interface PaddleDiscountResponse {
  discounts: Map<string, string>; // Map of code -> discountId
}

// Paddle API discount response structure
export interface PaddleApiDiscount {
  id: string;
  code: string;
  status: string;
  description: string;
  type: string;
  amount: string;
  currency_code: string | null;
  recur: boolean;
  maximum_recurring_intervals: number | null;
  usage_limit: number | null;
  times_used: number;
  expires_at: string | null;
  custom_data: any | null;
  created_at: string;
  updated_at: string;
}

export interface PaddleApiDiscountResponse {
  data: PaddleApiDiscount[];
  meta: {
    request_id: string;
    pagination?: {
      per_page: number;
      next: string | null;
      has_more: boolean;
      estimated_total: number;
    };
  };
}

