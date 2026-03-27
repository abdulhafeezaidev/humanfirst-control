/**
 * Data Retention Cleanup Edge Function
 * 
 * SECURITY: This function requires super_admin role
 * Role is validated from the database, not JWT claims
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders, requireSuperAdmin, isSuperAdmin } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // SECURITY: Require super_admin role for data cleanup operations
    const authCheck = await requireSuperAdmin(req);
    
    if ('response' in authCheck) {
      console.warn('Unauthorized data-retention-cleanup attempt');
      return authCheck.response;
    }

    const { auth } = authCheck;
    console.log(`Data cleanup initiated by super_admin: ${auth.userId} (${auth.email})`);

    // Create Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Run the cleanup function
    const { data, error } = await supabase.rpc('run_data_retention_cleanup')

    if (error) {
      console.error('Cleanup error:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Data retention cleanup completed:', data)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        result: data,
        message: `Cleanup completed: ${data.audit_logs_deleted} audit logs and ${data.tamper_events_deleted} tamper events deleted`,
        initiatedBy: auth.userId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
