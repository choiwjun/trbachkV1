
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { XMLParser } from "https://esm.sh/fast-xml-parser@4.5.0";

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
}

function fmtYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function requireBearer(req: Request) {
  // @ts-ignore
  const expected = Deno.env.get("EDGE_SYNC_BEARER") ?? "";
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) throw new Error("UNAUTHORIZED");
  const token = auth.slice(7).trim();
  if (!expected || token !== expected) throw new Error("UNAUTHORIZED");
}

async function fetchKcsUsdKrw(): Promise<{ rate: number; base_time: string; raw: any }> {
  // @ts-ignore
  const serviceKey = Deno.env.get("KCS_SERVICE_KEY");
  if (!serviceKey) throw new Error("Missing env: KCS_SERVICE_KEY");

  const aplyBgnDt = fmtYmd(new Date());
  const endpoint = "http://apis.data.go.kr/1220000/retrieveTrifFxrtInfo/getRetrieveTrifFxrtInfo";
  const url = new URL(endpoint);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("aplyBgnDt", aplyBgnDt);
  url.searchParams.set("weekFxrtTpcd", "2"); // 수입

  const res = await fetch(url.toString(), { headers: { "Accept": "application/xml" } });
  const xmlText = await res.text();
  if (!res.ok) throw new Error(`KCS_HTTP_${res.status}: ${xmlText.slice(0, 200)}`);

  const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: true, trimValues: true });
  const raw = parser.parse(xmlText);
  const items = raw?.response?.body?.items?.item ?? raw?.response?.body?.items ?? raw?.response?.body?.item;
  if (!items) throw new Error("KCS_PARSE_NO_ITEMS");
  const list = Array.isArray(items) ? items : [items];

  const usd = list.find((x: any) => String(x.currSgn).toUpperCase() === "USD");
  if (!usd) throw new Error("KCS_NO_USD_ROW");

  const rate = Number(usd.fxrt);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error(`KCS_BAD_RATE: ${usd.fxrt}`);

  const baseYmd = String(usd.aplyBgnDt || aplyBgnDt);
  const base_time = `${baseYmd.slice(0, 4)}-${baseYmd.slice(4, 6)}-${baseYmd.slice(6, 8)}T00:00:00+09:00`;

  return { rate, base_time, raw };
}

serve(async (req) => {
  try {
    requireBearer(req);

    // @ts-ignore
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const fx = await fetchKcsUsdKrw();

    const { error: fxErr } = await supabase.from("fx_rates").upsert(
      { base_currency: "USD", quote_currency: "KRW", rate: fx.rate, base_time: fx.base_time, source: "KCS", raw: fx.raw },
      { onConflict: "base_currency,quote_currency,base_time" },
    );
    if (fxErr) throw new Error(`FX_UPSERT_FAILED: ${fxErr.message}`);

    // tax_policy daily check touch
    const { data: activeTax, error: taxReadErr } = await supabase
      .from("tax_policy")
      .select("id")
      .eq("policy_key", "kr_import")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (taxReadErr || !activeTax) throw new Error("TAX_POLICY_NOT_FOUND");

    const { error: taxTouchErr } = await supabase
      .from("tax_policy")
      .update({ source: "KCS_SITE", source_checked_at: new Date().toISOString() })
      .eq("id", activeTax.id);
    if (taxTouchErr) throw new Error(`TAX_TOUCH_FAILED: ${taxTouchErr.message}`);

    return json(200, { ok: true, fx: { rate: fx.rate, base_time: fx.base_time }, tax_checked_at: new Date().toISOString() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(msg === "UNAUTHORIZED" ? 401 : 400, { ok: false, error: msg });
  }
});
