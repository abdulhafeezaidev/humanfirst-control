/// <reference path="../esm.d.ts" />
/**
 * Metrics Aggregator Edge Function
 * 
 * Computes privacy-preserving metrics from existing logs.
 * Can be called on-demand or via scheduled cron job.
 * 
 * Metrics computed:
 * - total_exam_sessions: Count of policy enforcement sessions
 * - enforcement_uptime_percentage: System availability
 * - violation_attempts: Aggregate tamper event counts
 * - average_focus_duration: Mean session length
 * - admin_actions_count: Total administrative actions
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

// CORS: origin is driven by the ALLOWED_ORIGIN env var (set per-environment).
// See supabase/functions/_shared/auth.ts for the canonical implementation.
const ALLOWED_ORIGIN =
  Deno.env.get('ALLOWED_ORIGIN') ?? 'http://localhost:5173';

function getCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  };
}

function unauthorized(message: string): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status: 401, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } }
  );
}

interface AggregatedMetrics {
  organization_id: string;
  period: {
    start: string;
    end: string;
    days: number;
  };
  metrics: {
    total_exam_sessions: number;
    enforcement_uptime_percentage: number;
    violation_attempts: number;
    average_focus_duration_minutes: number;
    admin_actions_count: number;
  };
  breakdown: {
    violations_by_type: Record<string, number>;
    sessions_by_policy_type: Record<string, number>;
    admin_actions_by_type: Record<string, number>;
  };
  compliance: {
    score: number;
    trend: 'improving' | 'stable' | 'declining';
  };
  computed_at: string;
}

interface ScheduledRequest {
  scheduled?: boolean;
  org_id?: string;
  period_days?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders() });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Parse request body for scheduled jobs
    let body: ScheduledRequest = {};
    if (req.method === 'POST') {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    const isScheduledJob = body.scheduled === true;
    console.log(`Metrics aggregation started. Scheduled: ${isScheduledJob}`);

    // For scheduled jobs, use service role to process all orgs
    // For on-demand, use user's auth token
    if (isScheduledJob) {
      const expectedSecret = Deno.env.get('HF_CRON_SECRET');
      const providedSecret = req.headers.get('x-cron-secret');

      if (!expectedSecret) {
        console.error('HF_CRON_SECRET is not set; refusing scheduled run');
        return unauthorized('Scheduled execution is not configured');
      }

      if (!providedSecret || providedSecret !== expectedSecret) {
        console.warn('Unauthorized scheduled metrics aggregation attempt');
        return unauthorized('Unauthorized');
      }

      // Scheduled job: aggregate for all active organizations
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('is_active', true);

      if (orgsError) {
        console.error('Failed to fetch organizations:', orgsError);
        throw new Error('Failed to fetch organizations');
      }

      console.log(`Processing ${orgs?.length || 0} organizations`);

      const results: { org_id: string; success: boolean; error?: string }[] = [];

      for (const org of orgs || []) {
        try {
          // Call the daily aggregation function
          const { error: aggError } = await supabase.rpc('aggregate_daily_metrics', {
            p_org_id: org.id,
            p_date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
          });

          if (aggError) {
            console.error(`Aggregation failed for org ${org.id}:`, aggError);
            results.push({ org_id: org.id, success: false, error: aggError.message });
          } else {
            console.log(`Aggregation successful for org ${org.id}`);
            results.push({ org_id: org.id, success: true });
          }
        } catch (err) {
          console.error(`Error processing org ${org.id}:`, err);
          results.push({ org_id: org.id, success: false, error: String(err) });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          scheduled: true,
          processed: results.length,
          results,
          computed_at: new Date().toISOString(),
        }),
        { 
          status: 200, 
          headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } 
        }
      );
    }

    // On-demand request: authenticate user and compute for their org
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Token validation failed:', userError?.message || 'No user');
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log(`Authenticated user: ${userId}`);

    // Check user role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (roleError) {
      console.error('Failed to fetch role:', roleError);
    }

    if (!roleData || !['super_admin', 'admin', 'viewer'].includes(roleData.role)) {
      console.error(`Access denied for user ${userId}, role: ${roleData?.role}`);
      return new Response(
        JSON.stringify({ error: 'Access denied. Admin role required.' }),
        { status: 403, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Failed to fetch profile:', profileError);
    }

    if (!profile?.organization_id) {
      console.error(`User ${userId} not associated with an organization`);
      return new Response(
        JSON.stringify({ error: 'User not associated with an organization' }),
        { status: 403, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    if (!profile?.organization_id) {
      return new Response(
        JSON.stringify({ error: 'User not associated with an organization' }),
        { status: 403, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    const orgId = profile.organization_id;
    const periodDays = body.period_days || 30;
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - periodDays * 86400000);

    console.log(`Computing metrics for org ${orgId}, period: ${periodDays} days`);

    // ============================================================
    // AGGREGATION LOGIC
    // All queries return aggregate counts only, no personal data
    // ============================================================

    // 1. Total Exam Sessions (from policy assignments + tamper events)
    const { count: sessionCount } = await supabase
      .from('tamper_events')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .gte('timestamp', periodStart.toISOString())
      .lte('timestamp', periodEnd.toISOString());

    // Get unique sessions by counting distinct policy enforcement periods
    const { data: policyData } = await supabase
      .from('exam_policies')
      .select('id, policy_type, start_time, end_time')
      .eq('organization_id', orgId)
      .gte('start_time', periodStart.toISOString())
      .lte('end_time', periodEnd.toISOString());

    const totalExamSessions = policyData?.length || 0;

    // Sessions by policy type
    const sessionsByType: Record<string, number> = { exam: 0, focus: 0, custom: 0 };
    policyData?.forEach(p => {
      sessionsByType[p.policy_type] = (sessionsByType[p.policy_type] || 0) + 1;
    });

    // 2. Enforcement Uptime Percentage
    // Calculate based on enforcement_config status changes in audit logs
    const { data: uptimeLogs } = await supabase
      .from('audit_logs')
      .select('action, timestamp, metadata')
      .eq('organization_id', orgId)
      .eq('target', 'enforcement_config')
      .gte('timestamp', periodStart.toISOString())
      .order('timestamp', { ascending: true });

    // Simple uptime calculation: assume 100% unless downtime events found
    let downtimeMinutes = 0;
    let lastDownTime: Date | null = null;

    uptimeLogs?.forEach(log => {
      const metadata = log.metadata as Record<string, unknown> | null;
      if (metadata?.status === 'not_connected') {
        lastDownTime = new Date(log.timestamp);
      } else if (lastDownTime && (metadata?.status === 'active' || metadata?.status === 'connected_simulated')) {
        downtimeMinutes += (new Date(log.timestamp).getTime() - lastDownTime.getTime()) / 60000;
        lastDownTime = null;
      }
    });

    const totalMinutes = periodDays * 24 * 60;
    const enforcementUptimePercentage = Math.max(0, Math.min(100, 
      ((totalMinutes - downtimeMinutes) / totalMinutes) * 100
    ));

    // 3. Violation Attempts (aggregate tamper events by type)
    const { data: violations } = await supabase
      .from('tamper_events')
      .select('event_type')
      .eq('organization_id', orgId)
      .gte('timestamp', periodStart.toISOString())
      .lte('timestamp', periodEnd.toISOString());

    const violationAttempts = violations?.length || 0;
    const violationsByType: Record<string, number> = {};
    violations?.forEach(v => {
      violationsByType[v.event_type] = (violationsByType[v.event_type] || 0) + 1;
    });

    // 4. Average Focus Duration (from policy time windows)
    let totalDurationMinutes = 0;
    let policyCount = 0;

    policyData?.forEach(p => {
      if (p.start_time && p.end_time) {
        const duration = (new Date(p.end_time).getTime() - new Date(p.start_time).getTime()) / 60000;
        if (duration > 0 && duration < 720) { // Max 12 hours
          totalDurationMinutes += duration;
          policyCount++;
        }
      }
    });

    const averageFocusDuration = policyCount > 0 
      ? Math.round(totalDurationMinutes / policyCount) 
      : 0;

    // 5. Admin Actions Count (from audit logs)
    const { data: adminActions } = await supabase
      .from('audit_logs')
      .select('action')
      .eq('organization_id', orgId)
      .gte('timestamp', periodStart.toISOString())
      .lte('timestamp', periodEnd.toISOString());

    const adminActionsCount = adminActions?.length || 0;
    const adminActionsByType: Record<string, number> = {};
    adminActions?.forEach(a => {
      adminActionsByType[a.action] = (adminActionsByType[a.action] || 0) + 1;
    });

    // Compute compliance score
    const resolutionRate = violationAttempts > 0 
      ? ((sessionCount || 0) / violationAttempts) * 100 
      : 100;
    
    const complianceScore = Math.min(100, Math.round(
      (enforcementUptimePercentage * 0.4) +
      (Math.min(resolutionRate, 100) * 0.4) +
      (adminActionsCount > 0 ? 20 : 0)
    ));

    // Build response
    const metrics: AggregatedMetrics = {
      organization_id: orgId,
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
        days: periodDays,
      },
      metrics: {
        total_exam_sessions: totalExamSessions,
        enforcement_uptime_percentage: Math.round(enforcementUptimePercentage * 100) / 100,
        violation_attempts: violationAttempts,
        average_focus_duration_minutes: averageFocusDuration,
        admin_actions_count: adminActionsCount,
      },
      breakdown: {
        violations_by_type: violationsByType,
        sessions_by_policy_type: sessionsByType,
        admin_actions_by_type: adminActionsByType,
      },
      compliance: {
        score: complianceScore,
        trend: complianceScore >= 80 ? 'stable' : complianceScore >= 60 ? 'improving' : 'declining',
      },
      computed_at: new Date().toISOString(),
    };

    console.log(`Metrics computed successfully for org ${orgId}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: metrics,
        cached: false,
      }),
      { 
        status: 200, 
        headers: { 
          ...getCorsHeaders(), 
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=300',
        } 
      }
    );

  } catch (error) {
    console.error('Metrics aggregator error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } }
    );
  }
});
