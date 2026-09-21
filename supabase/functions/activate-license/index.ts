import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { licenseKey, targetPlan } = await req.json();

    if (!licenseKey || !targetPlan) {
      throw new Error('License key and target plan are required');
    }

    // Check if the user is an owner or admin of an organization
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .single();

    if (roleError || !userRole) {
      throw new Error('You do not have permission to upgrade this organization.');
    }

    // TODO: Verify licenseKey with payment provider (e.g., Stripe)
    // For now, we will simulate verification. In production, fail if invalid.
    if (!licenseKey.startsWith('HF-')) {
      throw new Error('Invalid license key format');
    }

    // Apply the plan to the organization
    const { error: updateError } = await supabaseAdmin
      .from('organizations')
      .update({ plan_type: targetPlan })
      .eq('id', userRole.organization_id);

    if (updateError) {
      throw new Error('Failed to update organization plan');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Plan activated successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
