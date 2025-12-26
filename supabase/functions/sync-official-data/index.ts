
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
// @ts-ignore
import { XMLParser } from "https://esm.sh/fast-xml-parser@4.2.5"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Authentication (Custom Bearer Token)
    const authHeader = req.headers.get('Authorization')
    // @ts-ignore
    const expectedToken = Deno.env.get('EDGE_SYNC_BEARER')
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Initialize Supabase Client (Service Role for Admin Write Access)
    // @ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    // @ts-ignore
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 3. Prepare Date (KST)
    // Edge Functions run in UTC. We need KST (UTC+9) for the API parameter.
    const now = new Date()
    const kstOffset = 9 * 60 * 60 * 1000
    const kstDate = new Date(now.getTime() + kstOffset)
    
    // Format YYYYMMDD for API
    const yyyy = kstDate.toISOString().slice(0, 4)
    const mm = kstDate.toISOString().slice(5, 7)
    const dd = kstDate.toISOString().slice(8, 10)
    const aplyBgnDt = `${yyyy}${mm}${dd}`

    // 4. Call Korea Customs Service API
    // @ts-ignore
    const serviceKey = Deno.env.get('KCS_SERVICE_KEY')
    // weekFxrtTpcd=2 means "Import" (수입)
    const apiUrl = `http://apis.data.go.kr/1220000/retrieveTrifFxrtInfo/getRetrieveTrifFxrtInfo?serviceKey=${serviceKey}&aplyBgnDt=${aplyBgnDt}&weekFxrtTpcd=2`

    console.log(`Fetching from KCS: ${aplyBgnDt}`)
    
    const apiRes = await fetch(apiUrl)
    if (!apiRes.ok) throw new Error(`KCS API Failed: ${apiRes.statusText}`)
    
    const xmlText = await apiRes.text()
    
    // 5. Parse XML
    const parser = new XMLParser()
    const jsonObj = parser.parse(xmlText)
    
    // Navigate XML structure: response -> body -> items -> item[]
    const items = jsonObj?.response?.body?.items?.item
    if (!items) {
        console.error('API Response:', JSON.stringify(jsonObj))
        throw new Error('Invalid API Response Structure')
    }

    // Handle single item vs array logic (fast-xml-parser behavior)
    const itemList = Array.isArray(items) ? items : [items]
    
    // Find USD
    const usdItem = itemList.find((i: any) => i.currSgn === 'USD')
    if (!usdItem) throw new Error('USD rate not found in KCS response')

    const rate = parseFloat(usdItem.fxrt)
    
    // 6. DB Operation: Upsert FX Rate
    // Construct ISO string for KST 00:00:00 (e.g., 2023-10-25T00:00:00+09:00)
    // Note: Supabase timestamptz will store this as UTC, which is correct.
    const baseTimeISO = `${yyyy}-${mm}-${dd}T00:00:00+09:00`

    const { error: upsertError } = await supabase
      .from('fx_rates')
      .upsert({
        base_currency: 'USD',
        quote_currency: 'KRW',
        rate: rate,
        base_time: baseTimeISO,
        provider: 'customs_service'
      }, {
        onConflict: 'base_currency, quote_currency, base_time'
      })

    if (upsertError) throw new Error(`DB Upsert Failed: ${upsertError.message}`)

    // 7. DB Operation: Update Tax Policy Check Timestamp
    // Logic: Just 'touch' the active record to show we checked external sources.
    // v1.1 TODO: If we implement automatic tax rule fetching, calculate hash of new rules
    // and create a new version insert if changed, then toggle is_active.
    const { error: taxError } = await supabase
      .from('tax_policy')
      .update({ source_checked_at: new Date().toISOString() })
      .eq('is_active', true)

    if (taxError) console.warn(`Tax Policy update warning: ${taxError.message}`)

    return new Response(JSON.stringify({
      ok: true,
      fx_updated: {
        rate: rate,
        base_time: baseTimeISO,
        provider: 'customs_service'
      },
      tax_checked_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
