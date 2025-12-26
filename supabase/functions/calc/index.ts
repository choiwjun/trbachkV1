
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
}

type Platform = "KREAM" | "STOCKX" | "SOLDOUT" | "SMARTSTORE";
type Currency = "KRW" | "USD";

type CalcReq = {
  platform: Platform;
  buy_price_krw: number;
  sell_price: number;
  sell_currency: Currency;
  shipping_fee?: number;
  other_cost?: number;
  is_combined_tax_risk?: boolean;
  user_id?: string | null;
  client_context?: { ip?: string; ua?: string };
};

function validate(b: any): CalcReq {
  if (!b) throw new Error("Invalid body");
  const buy = Number(b.buy_price_krw);
  const sell = Number(b.sell_price);
  if (!Number.isFinite(buy) || buy <= 0) throw new Error("buy_price_krw must be > 0");
  if (!Number.isFinite(sell) || sell <= 0) throw new Error("sell_price must be > 0");
  return {
    platform: b.platform,
    buy_price_krw: buy,
    sell_price: sell,
    sell_currency: b.sell_currency,
    shipping_fee: b.shipping_fee ? Number(b.shipping_fee) : 0,
    other_cost: b.other_cost ? Number(b.other_cost) : 0,
    is_combined_tax_risk: Boolean(b.is_combined_tax_risk),
    user_id: b.user_id ?? null,
    client_context: { ip: b.client_context?.ip, ua: b.client_context?.ua },
  };
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });

    // @ts-ignore
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = validate(await req.json());

    const ip = body.client_context?.ip ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const ua = body.client_context?.ua ?? req.headers.get("user-agent") ?? "";

    // 1) Load policies
    // Note: Assuming 'platform' column or 'platform_name' column depending on schema version. 
    // The prompt specifies 'platform_name'.
    const { data: feeRule, error: feeErr } = await supabase
      .from("platform_fee_rules")
      .select("*")
      .eq("platform_name", body.platform) // Schema should match this
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    // Fallback or Error if no rule found. 
    // In production, you might want a default fallback, but strict error ensures data integrity.
    if (feeErr || !feeRule) {
        // Retry with just 'platform' if 'platform_name' fails (common schema drift issue) or throw
        throw new Error(`FEE_RULE_NOT_FOUND for ${body.platform}`);
    }

    const { data: taxPolicy, error: taxErr } = await supabase
      .from("tax_policy")
      .select("*")
      .eq("policy_key", "kr_import")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (taxErr || !taxPolicy) throw new Error("TAX_POLICY_NOT_FOUND");

    // 2) Resolve USDKRW (latest)
    const { data: fx, error: fxErr } = await supabase
      .from("fx_rates")
      .select("rate, base_time")
      .eq("base_currency", "USD")
      .eq("quote_currency", "KRW")
      .order("base_time", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (fxErr || !fx) throw new Error("FX_NOT_AVAILABLE");

    const usdkrw = Number(fx.rate);
    const fxBaseTime = String(fx.base_time);

    // 3) normalize sell_price_krw
    const sell_price_krw = body.sell_currency === "KRW" ? Math.round(body.sell_price) : Math.round(body.sell_price * usdkrw);

    // 4) base costs
    const shipping = body.shipping_fee ?? 0;
    const other = body.other_cost ?? 0;
    const base_cost_krw = Math.round(body.buy_price_krw + shipping + other);

    // 5) fee calc (rule-based)
    let platformFee = 0;
    const rate = Number(feeRule.rate ?? 0);
    
    // Logic handles different fee types defined in the DB
    if (feeRule.fee_type === "PERCENT") platformFee = sell_price_krw * rate;
    else if (feeRule.fee_type === "FIXED") platformFee = Number(feeRule.fixed_amount_krw ?? 0);
    else if (feeRule.fee_type === "MINMAX") {
      const base = sell_price_krw * rate;
      platformFee = Math.max(Number(feeRule.min_fee_krw ?? 0), Math.min(Number(feeRule.max_fee_krw ?? base), base));
    } else {
        // Default simple calculation if fee_type not explicit
        platformFee = (sell_price_krw * rate) + Number(feeRule.min_fee ?? 0);
    }

    platformFee = Math.round(platformFee);
    const fees = [{ code: "PLATFORM_FEE", name: "플랫폼 수수료", amount_krw: platformFee }];
    const fee_total_krw = platformFee;

    // 6) TAX (USD duty-free 기준)
    const warnings: Array<{ code: string; message: string }> = [];
    const dutyFreeUsd = Number(taxPolicy.duty_free_limit_usd);
    const multiplier = Number(taxPolicy.combined_tax_conservative_multiplier ?? 1);

    const effectiveDutyFreeUsd = body.is_combined_tax_risk ? dutyFreeUsd * multiplier : dutyFreeUsd;
    if (body.is_combined_tax_risk) warnings.push({ code: "COMBINED_TAX_RISK", message: "합산과세 위험이 있어 보수적으로 계산했습니다." });

    const tax_base_krw = base_cost_krw; // Usually Buy Price + Shipping is the Tax Base
    const tax_base_usd = tax_base_krw / usdkrw;

    let customs = 0, vat = 0;
    if (tax_base_usd > effectiveDutyFreeUsd) {
      customs = Math.round(tax_base_krw * Number(taxPolicy.customs_rate ?? taxPolicy.duty_rate)); // Handle potential column name difference
      // VAT Base: strictly (CIF + Duty) for Korea
      const vatBase = (taxPolicy.vat_base_mode === "BASE_ONLY") ? tax_base_krw : (tax_base_krw + customs);
      vat = Math.round(vatBase * Number(taxPolicy.vat_rate));
    }
    const taxes = [
      { code: "CUSTOMS", name: "관세", amount_krw: customs },
      { code: "VAT", name: "부가세", amount_krw: vat },
    ].filter(x => x.amount_krw !== 0);
    const tax_total_krw = customs + vat;

    // 7) profit
    const profit_krw = Math.round(sell_price_krw - base_cost_krw - fee_total_krw - tax_total_krw);
    const profit_rate = base_cost_krw > 0 ? profit_krw / base_cost_krw : 0;
    const status = profit_krw >= 0 ? "PROFIT" : "LOSS";

    // 8) persist log + result snapshot
    const { data: logRow, error: logErr } = await supabase.from("calculation_logs").insert({
      user_id: body.user_id ?? null,
      platform_name: body.platform,
      input_price: body.buy_price_krw,
      target_price: sell_price_krw,
      margin: profit_krw,
      ip_address: ip,
      user_agent: ua,
    }).select("id").single();
    if (logErr || !logRow) throw new Error(`LOG_INSERT_FAILED: ${logErr.message}`);

    const payload = {
      platform: body.platform,
      buy_price_krw: body.buy_price_krw,
      sell_price_krw,
      fee_total_krw,
      tax_total_krw,
      cost_total_krw: base_cost_krw,
      profit_krw,
      profit_rate,
      status,
      badges: {
        fx_rate: usdkrw,
        fx_base_time: fxBaseTime,
        fee_policy_version: feeRule.version,
        tax_policy_version: taxPolicy.version,
        calc_engine: "edge_v1",
      },
      warnings,
      breakdown: { fees, taxes },
    };

    const { data: resRow, error: resErr } = await supabase.from("calc_results").insert({
      calc_log_id: logRow.id,
      payload,
    }).select("id").single();
    if (resErr || !resRow) throw new Error("RESULT_INSERT_FAILED");

    return json(200, { result_id: resRow.id, ...payload });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(400, { error: "BAD_REQUEST", message: msg });
  }
});
