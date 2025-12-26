
import { AdminSettings, FeeRule, TaxPolicy, Banner } from '../types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Helper to get token
const getAdminToken = () => {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem('trbachk_admin_key') || '';
};

const adminFetch = async (action: string, payload: any = {}) => {
  const token = getAdminToken();
  if (!token) throw new Error('No Admin Token Found');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-ops`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ action, payload })
  });

  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message || 'Admin API Failed');
  return json.data;
};

// --- API Methods ---

export const getAdminSettings = async () => {
  return adminFetch('get-settings');
};

export const updateGlobalSettings = async (settings: Partial<AdminSettings>) => {
  return adminFetch('update-settings', settings);
};

export const updateFeeRule = async (rule: FeeRule) => {
  return adminFetch('update-policy', { type: 'fee', data: rule });
};

export const updateTaxPolicy = async (policy: TaxPolicy) => {
  return adminFetch('update-policy', { type: 'tax', data: policy });
};

export const updateBanners = async (banners: Banner[]) => {
  return adminFetch('update-banners', { banners });
};
