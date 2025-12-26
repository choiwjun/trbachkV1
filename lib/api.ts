
import { CalcInput, CalcResult } from '../types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${ANON_KEY}`,
};

export async function calculateProfit(input: CalcInput): Promise<CalcResult> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/calc`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Calculation failed');
  }

  const json = await res.json();
  return json.data;
}

export async function trackBannerClick(bannerId: string, variant: string) {
  // Fire and forget
  fetch(`${SUPABASE_URL}/functions/v1/affiliate-click`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ bannerId, variant, timestamp: new Date() }),
  }).catch(console.error);
}

// Mock for Admin Data
export async function fetchAdminStats() {
  // In real app, this calls an RPC or Edge Function
  return {
    todayCount: 142,
    platformRatio: { kream: 60, stockx: 30, soldout: 10 },
    bannerCTR: 4.2
  };
}
