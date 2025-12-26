// --- Database & Entity Types ---

export type Platform = 'kream' | 'stockx' | 'soldout' | 'smartstore';

export interface ExchangeRate {
  currency: string;
  rate: number; // e.g., 1350.50
  date: string; // ISO Date
  provider: 'customs_service' | 'manual_override';
}

export interface PlatformPolicy {
  id: string;
  platform: Platform;
  fee_rate: number; // e.g., 0.15 for 15%
  fixed_fee: number; // e.g., 0 or 3000 KRW
  shipping_fee_policy: number; // e.g., 3000
  updated_at: string;
}

// --- Calculation Types (Edge Function I/O) ---

export interface CalculationRequest {
  platform: Platform;
  buyPriceUSD: number;
  sellPriceKRW: number;
  shippingCostUSD: number;
  quantity: number;
  isVATIncluded?: boolean; // Default true
}

export interface CalculationResult {
  meta: {
    exchangeRate: number;
    platform: Platform;
    timestamp: string;
  };
  breakdown: {
    buyPriceKRW: number; // Converted
    shippingKRW: number; // Converted
    customsDuty: number; // Gwan-se
    vat: number; // Bu-ga-se (Import)
    platformFee: number;
    platformShippingFee: number; // Cost to ship to platform
    totalCost: number;
    grossRevenue: number;
  };
  outcome: {
    profit: number;
    marginRate: number; // %
    isLoss: boolean;
    breakEvenPoint: number;
  };
  risk: {
    taxWarning: boolean; // Over $150/$200 limit risk
    taxWarningMessage?: string;
  };
}
