/// <reference path="../esm.d.ts" />
/**
 * Enforcement Metrics Edge Function
 * 
 * Read-only API for admins/viewers to access privacy-preserving
 * enforcement metrics. No content inspection, institution-scoped.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'http://localhost:5173';
function getCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

type AppRole = 'super_admin' | 'admin' | 'viewer' | 'student';

interface MetricsRequest {
  period?: 'day' | 'week' | 'month' | 'quarter';
}

const PERIOD_DAYS: Record<string, number> = {
  day: 1,
  week: 7,
  month: 30,
  quarter: 90,
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders() });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use GET.' }),
      { status: 405, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's auth token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('JWT validation failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user's role from database
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('Failed to fetch user role:', roleError);
      return new Response(
        JSON.stringify({ error: 'User has no assigned role' }),
        { status: 403, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    const userRole = roleData.role as AppRole;

    // Only allow super_admin, admin, or viewer to access metrics
    if (!['super_admin', 'admin', 'viewer'].includes(userRole)) {
      return new Response(
        JSON.stringify({ error: 'Access denied. Only administrators can view metrics.' }),
        { status: 403, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError || !profile?.organization_id) {
      console.error('Failed to fetch organization:', profileError);
      return new Response(
        JSON.stringify({ error: 'User not associated with an organization' }),
        { status: 403, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = profile.organization_id;

    // Parse query params
    const url = new URL(req.url);
    const period = url.searchParams.get('period') || 'month';
    const periodDays = PERIOD_DAYS[period] || 30;

    console.log(`Fetching metrics for org ${organizationId}, period: ${period} (${periodDays} days)`);

    // Call the aggregation function
    const { data: metrics, error: metricsError } = await supabase.rpc(
      'get_enforcement_metrics',
      {
        p_org_id: organizationId,
        p_period_days: periodDays,
      }
    );

    if (metricsError) {
      console.error('Failed to compute metrics:', metricsError);
      return new Response(
        JSON.stringify({ error: 'Failed to compute metrics', details: metricsError.message }),
        { status: 500, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Metrics computed for ${userRole} (${user.id})`);

    // Return the metrics
    const response = {
      success: true,
      metrics,
      cached: false, // Could implement caching in future
      cache_ttl_seconds: 300,
      period,
      period_days: periodDays,
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { 
          ...getCorsHeaders(), 
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=300', // 5 min client cache
        } 
      }
    );

  } catch (error) {
    console.error('Metrics endpoint error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } }
    );
  }
});
