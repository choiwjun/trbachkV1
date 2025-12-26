
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from '../_shared/cors.ts'
import { createErrorResponse, createSuccessResponse } from '../_shared/response.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Security Check (Admin Bearer Token)
    const authHeader = req.headers.get('Authorization')
    // @ts-ignore
    const adminSecret = Deno.env.get('ADMIN_BEARER')

    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return createErrorResponse({ code: 'UNAUTHORIZED', message: 'Admin access denied' }, 401)
    }

    // 2. Initialize Supabase (Service Role)
    const supabase = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, payload } = await req.json()
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown'

    // 3. Routing Logic
    let resultData = null;

    if (action === 'get-settings') {
      // Fetch all relevant configs
      const [settingsRes, rulesRes, taxRes] = await Promise.all([
        supabase.from('app_settings').select('*').single(),
        supabase.from('platform_fee_rules').select('*').eq('is_active', true),
        supabase.from('tax_policy').select('*').eq('is_active', true).single()
      ]);

      resultData = {
        settings: settingsRes.data || { fx_mode: 'AUTO', manual_fx_rate: 1350, maintenance_mode: false },
        feeRules: rulesRes.data || [],
        taxPolicy: taxRes.data
      };

    } else if (action === 'update-settings') {
      // Payload: { key: 'fx_mode', value: 'MANUAL' } etc.
      // We assume app_settings is a single row or key-value store. Let's assume single row 'config' for MVP.
      const { data, error } = await supabase
        .from('app_settings')
        .upsert({ id: 1, ...payload }) // Assuming ID 1 is the singleton config
        .select()
        .single();
      
      if (error) throw error;
      resultData = data;
      await logAudit(supabase, 'UPDATE_SETTINGS', payload, ipAddress);

    } else if (action === 'update-policy') {
      // Payload: { type: 'fee' | 'tax', data: ... }
      if (payload.type === 'fee') {
        // Disable old rule for platform -> Insert new
        await supabase.from('platform_fee_rules')
          .update({ is_active: false })
          .eq('platform', payload.data.platform);
        
        const { data, error } = await supabase.from('platform_fee_rules')
          .insert({ ...payload.data, is_active: true, created_at: new Date() })
          .select()
          .single();
        if (error) throw error;
        resultData = data;

      } else if (payload.type === 'tax') {
         await supabase.from('tax_policy')
          .update({ is_active: false })
          .eq('policy_key', 'kr_import');

         const { data, error } = await supabase.from('tax_policy')
          .insert({ ...payload.data, policy_key: 'kr_import', is_active: true })
          .select()
          .single();
         if (error) throw error;
         resultData = data;
      }
      await logAudit(supabase, 'UPDATE_POLICY', payload, ipAddress);

    } else if (action === 'update-banners') {
       // Upsert banners
       const { data, error } = await supabase
         .from('banners')
         .upsert(payload.banners)
         .select();
       
       if (error) throw error;
       resultData = data;
       await logAudit(supabase, 'UPDATE_BANNERS', payload, ipAddress);

    } else {
      return createErrorResponse({ code: 'INVALID_ACTION', message: `Unknown action: ${action}` })
    }

    return createSuccessResponse(resultData)

  } catch (error) {
    console.error('Admin Ops Error:', error)
    return createErrorResponse({ code: 'INTERNAL_ERROR', message: error.message }, 500)
  }
})

async function logAudit(supabase: any, action: string, payload: any, ip: string) {
  await supabase.from('audit_logs').insert({
    action,
    payload,
    admin_ip: ip,
    performed_at: new Date()
  })
}
