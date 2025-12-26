
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from '../_shared/cors.ts'
import { createErrorResponse, createSuccessResponse } from '../_shared/response.ts'

// --- Types ---
interface CalcInput {
  platform: 'kream' | 'stockx' | 'soldout' | 'smartstore';
  buy_price_krw: number;
  sell_price: number;
  sell_currency: 'KRW' | 'USD';
  shipping_fee?: number; // International shipping cost (usually USD or converted KRW)
  other_cost?: number;
  is_combined_tax_risk?: boolean;
  client_context?: {
    ip?: string;
    ua?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Initialize & Validation
    const supabase = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Use Service Role for Logs
    )

    let body: CalcInput;
    try {
      body = await req.json()
    } catch {
      return createErrorResponse({ code: 'INVALID_JSON', message: '잘못된 요청 형식입니다.' })
    }

    const { 
      platform, 
      buy_price_krw, 
      sell_price, 
      sell_currency, 
      shipping_fee = 0, 
      other_cost = 0,
      is_combined_tax_risk = false,
      client_context 
    } = body

    // Basic Validation
    if (buy_price_krw < 0 || sell_price < 0) {
      return createErrorResponse({ code: 'INVALID_INPUT', message: '금액은 0보다 커야 합니다.' })
    }

    const ipAddress = req.headers.get('x-forwarded-for') || client_context?.ip || 'unknown'

    // 2. Rate Limiting (Soft Throttle using DB Logs)
    // Check requests from this IP in the last 1 minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
    const { count: requestCount, error: countError } = await supabase
      .from('calculation_logs')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', ipAddress)
      .gt('created_at', oneMinuteAgo)

    if (countError) console.error('RateLimit Check Failed:', countError)

    if (requestCount !== null && requestCount > 10) {
      return createErrorResponse({ 
        code: 'RATE_LIMIT_EXCEEDED', 
        message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' 
      }, 429)
    }

    // 3. Load Dependencies (Parallel Fetch)
    const [fxRes, platformRes, taxRes] = await Promise.all([
      // A. FX Rate
      supabase.from('fx_rates')
        .select('*')
        .eq('base_currency', 'USD')
        .eq('quote_currency', 'KRW')
        .order('base_time', { ascending: false })
        .limit(1)
        .single(),
      
      // B. Platform Rules
      supabase.from('platform_fee_rules')
        .select('*')
        .eq('platform', platform)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),

      // C. Tax Policy
      supabase.from('tax_policy')
        .select('*')
        .eq('policy_key', 'kr_import') // Default policy key for KR imports
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
    ])

    if (fxRes.error) return createErrorResponse({ code: 'FX_ERROR', message: '환율 정보를 불러올 수 없습니다.', devMessage: fxRes.error.message })
    if (platformRes.error) return createErrorResponse({ code: 'POLICY_ERROR', message: '플랫폼 정책을 불러올 수 없습니다.', devMessage: platformRes.error.message })
    
    // Default tax policy fallback if not found in DB
    const taxPolicy = taxRes.data || { 
      duty_rate: 0.13, 
      vat_rate: 0.10, 
      duty_free_limit_usd: 150, 
      policy_key: 'default_fallback',
      version: 'v0' 
    }

    const fxRate = fxRes.data.rate
    const feeRule = platformRes.data

    // 4. Core Calculation
    
    // A. Currency Normalization (Everything to KRW for Profit Calc, USD for Tax Calc)
    // Input Assumption: buy_price_krw is already in KRW (as per user input usually). 
    // If shipping_fee is for international shipping, it's cost.
    
    const buyPriceKRW = buy_price_krw
    const shippingFeeKRW = shipping_fee // Assumed input is KRW or normalized. If USD, client should convert or add currency field. Assuming KRW for now based on 'shipping_fee' context in KR apps.
    
    // Calculate Sell Price in KRW
    let sellPriceKRW = sell_price
    if (sell_currency === 'USD') {
      sellPriceKRW = sell_price * fxRate
    }

    // B. Platform Fee Calculation
    // Logic: (SellPrice * Rate) + FixedFee + PlatformShippingFee
    const platformFee = (sellPriceKRW * feeRule.rate) + feeRule.min_fee
    const platformShippingFee = feeRule.shipping_fee // Fee charged by platform to seller (e.g. shipping to warehouse)

    // C. Tax Calculation (Import Duty + VAT)
    // Tax Base is usually (Item Price + Int. Shipping) in USD
    const taxBaseKRW = buyPriceKRW + shippingFeeKRW
    const taxBaseUSD = taxBaseKRW / fxRate

    // Risk Logic
    let effectiveDutyLimit = taxPolicy.duty_free_limit_usd
    const warningMessages: string[] = []

    if (is_combined_tax_risk) {
      // Conservative multiplier (e.g., 0.8) implicitly, or just strict checking.
      // Here we just warn strictly. logic: if user buys 2 items of $100, combined is $200 > $150.
      // We assume the input `buy_price` is for THIS item.
      // If risk is ON, we might force tax calculation even if below limit? 
      // Scenario 4: "if is_combined_tax_risk: * combined_tax_conservative_multiplier"
      // Let's assume a multiplier field exists or use default 1.0 (logic placeholder)
      // For now, we just tag it.
    }

    const isTaxable = taxBaseUSD > effectiveDutyLimit
    let customsDuty = 0
    let vat = 0

    if (isTaxable) {
      // KR Import Tax Logic:
      // Duty = TaxBase * DutyRate
      // VAT = (TaxBase + Duty) * VATRate
      customsDuty = taxBaseKRW * taxPolicy.duty_rate
      vat = (taxBaseKRW + customsDuty) * taxPolicy.vat_rate
      
      warningMessages.push(`관세청 기준 한도($${effectiveDutyLimit})를 초과하여 관부가세가 부과되었습니다.`)
    } else if (is_combined_tax_risk && taxBaseUSD * 2 > effectiveDutyLimit) {
      // Heuristic warning if risk flag is on
       warningMessages.push("합산 과세 주의: 다른 물품과 입항일이 겹치면 과세될 수 있습니다.")
    }

    // D. Outcome
    const totalCost = buyPriceKRW + shippingFeeKRW + other_cost + customsDuty + vat + platformFee + platformShippingFee
    const grossRevenue = sellPriceKRW
    const profit = grossRevenue - totalCost
    const marginRate = grossRevenue > 0 ? (profit / grossRevenue) * 100 : 0
    // Break Even Point: (Fixed Costs) / (1 - Variable Fee Rate)
    // Fixed Costs = Buy + Shipping + Tax + FixedFee + PlatformShipping
    const variableFeeRate = feeRule.rate
    const fixedCosts = buyPriceKRW + shippingFeeKRW + other_cost + customsDuty + vat + feeRule.min_fee + platformShippingFee
    const breakEvenPrice = fixedCosts / (1 - variableFeeRate)

    const resultPayload = {
      meta: {
        currency: 'KRW',
        timestamp: new Date().toISOString(),
        fx_rate: fxRate,
      },
      breakdown: {
        buy_price: buyPriceKRW,
        intl_shipping: shippingFeeKRW,
        customs_duty: Math.floor(customsDuty),
        vat: Math.floor(vat),
        platform_fee: Math.floor(platformFee),
        platform_shipping_fee: platformShippingFee,
        other_cost: other_cost,
        total_cost: Math.floor(totalCost),
        gross_revenue: Math.floor(grossRevenue)
      },
      outcome: {
        profit: Math.floor(profit),
        margin_rate: parseFloat(marginRate.toFixed(2)),
        break_even_price: Math.floor(breakEvenPrice),
        is_loss: profit < 0
      },
      badges: {
        fx_provider: fxRes.data.provider,
        fx_date: fxRes.data.base_time,
        policy_ver: feeRule.version || 'v1',
        tax_rule: taxPolicy.policy_key
      },
      warnings: warningMessages
    }

    // 5. Persistence
    // A. Log Entry
    const { data: logData, error: logError } = await supabase
      .from('calculation_logs')
      .insert({
        platform: platform,
        ip_address: ipAddress,
        buy_usd: buyPriceKRW / fxRate, // Approx store
        sell_krw: sellPriceKRW,
        profit: profit,
        input_payload: body,
        // If we have a result column, store it, otherwise calc_results table
      })
      .select()
      .single()
    
    // B. Result Snapshot (Optional per schema, assuming table exists or part of logs)
    if (logData) {
       await supabase.from('calc_results').insert({
         log_id: logData.id,
         result_payload: resultPayload,
         snapshot_version: 'v1'
       })
    }

    return createSuccessResponse(resultPayload)

  } catch (error) {
    console.error('Unexpected Error:', error)
    return createErrorResponse({ code: 'INTERNAL_ERROR', message: '서버 내부 오류가 발생했습니다.', devMessage: error.message }, 500)
  }
})
