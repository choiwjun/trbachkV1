
export type Platform = 'kream' | 'stockx' | 'soldout' | 'smartstore';

export interface CalcInput {
  platform: Platform;
  buy_price_krw: number;
  sell_price: number;
  sell_currency: 'KRW' | 'USD';
  shipping_fee?: number;
  other_cost?: number;
  is_combined_tax_risk?: boolean;
  client_context?: {
    ip?: string;
    ua?: string;
  };
}

export interface CalcResult {
  meta: {
    currency: string;
    timestamp: string;
    fx_rate: number;
  };
  breakdown: {
    buy_price: number;
    intl_shipping: number;
    customs_duty: number;
    vat: number;
    platform_fee: number;
    platform_shipping_fee: number;
    other_cost: number;
    total_cost: number;
    gross_revenue: number;
  };
  outcome: {
    profit: number;
    margin_rate: number;
    break_even_price: number;
    is_loss: boolean;
  };
  badges: {
    fx_provider: string;
    fx_date: string;
    policy_ver: string;
    tax_rule: string;
  };
  warnings: string[];
}

export interface CalculationLog {
  id: string;
  platform: Platform;
  input: CalcInput;
  result: CalcResult;
  created_at: string;
}

export interface Banner {
  id: string;
  variant: 'A' | 'B';
  imageUrl: string;
  linkUrl: string;
  weight: number;
  is_active: boolean;
}

// Added for frontend/mock service compatibility
export interface CalculationRequest {
  platform: Platform;
  buyPriceUSD: number;
  shippingCostUSD: number;
  sellPriceKRW: number;
  quantity: number;
  isVATIncluded?: boolean;
}

export interface CalculationResult {
  meta: {
    exchangeRate: number;
    platform: Platform;
    timestamp: string;
  };
  breakdown: {
    buyPriceKRW: number;
    shippingKRW: number;
    customsDuty: number;
    vat: number;
    platformFee: number;
    platformShippingFee: number;
    totalCost: number;
    grossRevenue: number;
  };
  outcome: {
    profit: number;
    marginRate: number;
    isLoss: boolean;
    breakEvenPoint: number;
  };
  risk: {
    taxWarning: boolean;
    taxWarningMessage?: string;
  };
}

// --- Admin Types ---
export interface AdminSettings {
  fx_mode: 'AUTO' | 'MANUAL';
  manual_fx_rate: number;
  maintenance_mode: boolean;
}

export interface FeeRule {
  id?: string;
  platform: Platform;
  rate: number;
  min_fee: number;
  shipping_fee: number;
  is_active: boolean;
  version: string;
}

export interface TaxPolicy {
  id?: string;
  policy_key: string;
  duty_rate: number;
  vat_rate: number;
  duty_free_limit_usd: number;
  is_active: boolean;
}
