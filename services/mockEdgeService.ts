import { CalculationRequest, CalculationResult, Platform } from '../types';
import { fetchKCSExchangeRate } from './kcsService';

/**
 * SIMULATION ONLY.
 * In production, this would call the Supabase Edge Function URL.
 */
export const calculateProfit = async (req: CalculationRequest): Promise<CalculationResult> => {
  // Simulate network delay for realistic UX (Optimistic UI testing)
  await new Promise(resolve => setTimeout(resolve, 600));

  // Try fetching real rate, fallback to mock if failed
  let exchangeRate = 1380.50;
  const realRate = await fetchKCSExchangeRate();
  if (realRate) {
    exchangeRate = realRate;
  }

  const MOCK_EXCHANGE_RATE = exchangeRate;

  // Platform Policies (Mocking DB)
  const policies: Record<Platform, { rate: number; fixed: number; shipping: number }> = {
    kream: { rate: 0.055, fixed: 0, shipping: 3000 },
    stockx: { rate: 0.10, fixed: 0, shipping: 0 },
    soldout: { rate: 0.06, fixed: 0, shipping: 3000 },
    smartstore: { rate: 0.05, fixed: 0, shipping: 2500 },
  };

  const policy = policies[req.platform];
  const quantity = req.quantity || 1;
  const totalBuyUSD = (req.buyPriceUSD + req.shippingCostUSD) * quantity;
  const buyPriceKRW = totalBuyUSD * MOCK_EXCHANGE_RATE;

  // Threshold Logic ($150)
  const isOverThreshold = totalBuyUSD > 150;

  let customsDuty = 0;
  let vat = 0;

  if (isOverThreshold) {
    // 13% Duty, 10% VAT
    customsDuty = buyPriceKRW * 0.13;
    vat = (buyPriceKRW + customsDuty) * 0.10;
  }

  const grossRevenue = req.sellPriceKRW * quantity;
  const platformFee = grossRevenue * policy.rate + policy.fixed;
  const platformShipping = policy.shipping * quantity;

  const totalCost = buyPriceKRW + customsDuty + vat + platformFee + platformShipping;
  const profit = grossRevenue - totalCost;
  const marginRate = grossRevenue > 0 ? (profit / grossRevenue) * 100 : 0;
  const breakEvenPoint = (buyPriceKRW + customsDuty + vat + platformShipping) / (1 - policy.rate);

  return {
    meta: {
      exchangeRate: MOCK_EXCHANGE_RATE,
      platform: req.platform,
      timestamp: new Date().toISOString(),
    },
    breakdown: {
      buyPriceKRW,
      shippingKRW: req.shippingCostUSD * MOCK_EXCHANGE_RATE,
      customsDuty,
      vat,
      platformFee,
      platformShippingFee: platformShipping,
      totalCost,
      grossRevenue
    },
    outcome: {
      profit,
      marginRate,
      isLoss: profit < 0,
      breakEvenPoint
    },
    risk: {
      taxWarning: isOverThreshold,
      taxWarningMessage: isOverThreshold ? "관세 면제 한도($150)를 초과하여 관부가세가 적용되었습니다." : undefined
    }
  };
};