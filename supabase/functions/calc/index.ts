// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { platform, buyPriceUSD, sellPriceKRW, shippingCostUSD, quantity } = await req.json()

    // 1. Fetch Latest Exchange Rate
    const { data: rateData, error: rateError } = await supabaseClient
      .from('exchange_rates')
      .select('rate')
      .order('date', { ascending: false })
      .limit(1)
      .single()

    if (rateError) throw new Error('Failed to fetch exchange rate')
    
    const exchangeRate = rateData.rate
    // Fallback or Safe Default could be implemented here if DB is empty
    
    // 2. Fetch Platform Policy
    const { data: policyData, error: policyError } = await supabaseClient
      .from('platform_policies')
      .select('*')
      .eq('platform', platform)
      .eq('is_active', true)
      .single()

    if (policyError) throw new Error('Failed to fetch platform policy')

    // 3. Core Logic (The Business Rule)
    const quantityNum = quantity || 1
    const totalBuyUSD = (buyPriceUSD * quantityNum) + shippingCostUSD
    const buyPriceKRW = totalBuyUSD * exchangeRate
    
    // Customs Duty Logic (Simple Threshold for MVP)
    // In Korea, List Clearance limit is $150 (or $200 for US). 
    // Simplified: Assuming $150 limit for general safety in this MVP version.
    const dutyThresholdUSD = 150
    const isOverThreshold = totalBuyUSD > dutyThresholdUSD
    
    let customsDuty = 0
    let vat = 0
    
    if (isOverThreshold) {
      // Approximate: 13% Apparel duty + 10% VAT on top
      // This logic should ideally be fetched from a 'categories' table
      const dutyRate = 0.13 
      customsDuty = buyPriceKRW * dutyRate
      vat = (buyPriceKRW + customsDuty) * 0.10
    }

    const platformFee = (sellPriceKRW * quantityNum) * policyData.fee_rate + policyData.fixed_fee
    const platformShippingFee = policyData.shipping_fee_policy * quantityNum // Cost to ship to KREAM/StockX
    
    const totalRevenue = sellPriceKRW * quantityNum
    const totalCost = buyPriceKRW + customsDuty + vat + platformFee + platformShippingFee
    const profit = totalRevenue - totalCost
    const marginRate = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0
    const breakEvenPoint = (buyPriceKRW + customsDuty + vat + platformShippingFee) / (1 - policyData.fee_rate)

    const result = {
      meta: {
        exchangeRate,
        platform,
        timestamp: new Date().toISOString(),
      },
      breakdown: {
        buyPriceKRW,
        shippingKRW: shippingCostUSD * exchangeRate,
        customsDuty,
        vat,
        platformFee,
        platformShippingFee,
        totalCost,
        grossRevenue: totalRevenue
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
    }

    // 4. Async Log (Fire and forget, don't await strictly if performance is key, but Supabase JS is async)
    await supabaseClient.from('calculation_logs').insert({
      platform,
      buy_usd: buyPriceUSD,
      sell_krw: sellPriceKRW,
      profit: profit,
    })

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})