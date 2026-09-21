/// <reference path="../esm.d.ts" />
/**
 * Audit Logs Edge Function
 * 
 * Read-only endpoint for OWNER_ADMIN to query audit logs
 * with filtering, pagination, and export capabilities.
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

interface AuditLogEntry {
  id: string;
  actor_id: string;
  actor_role: string;
  actor_name: string | null;
  actor_email: string | null;
  action: string;
  target: string;
  target_id: string;
  organization_id: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

interface AuditLogResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders() });
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

    // Fetch user's role from database (never trust JWT claims)
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

    // Only allow super_admin, admin, or viewer to access audit logs
    if (!['super_admin', 'admin', 'viewer'].includes(userRole)) {
      return new Response(
        JSON.stringify({ error: 'Access denied. Only administrators can view audit logs.' }),
        { status: 403, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // Parse URL for query params
    const url = new URL(req.url);
    const action = url.searchParams.get('action'); // Filter by action type
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '50', 10), 100);
    const format = url.searchParams.get('format') || 'json'; // json or csv

    // Use the RPC to fetch logs (respects RLS and includes role info)
    const { data: logs, error: logsError } = await supabase.rpc('get_audit_logs_with_details', {
      p_limit: pageSize + 1, // Fetch one extra to check hasMore
      p_offset: (page - 1) * pageSize,
      p_action_filter: action || null,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    if (logsError) {
      console.error('Failed to fetch audit logs:', logsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch audit logs', details: logsError.message }),
        { status: 500, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // Check if there are more results
    const hasMore = logs && logs.length > pageSize;
    const resultLogs = hasMore ? logs.slice(0, pageSize) : (logs || []);

    // Map to clean response format
    const formattedLogs: AuditLogEntry[] = resultLogs.map((row: {
      log_id: string;
      log_actor_id: string;
      log_action: string;
      log_target: string;
      log_target_id: string;
      log_organization_id: string;
      log_timestamp: string;
      log_metadata: Record<string, unknown>;
      log_actor_role: string;
      log_actor_name: string;
      log_actor_email: string;
    }) => ({
      id: row.log_id,
      actor_id: row.log_actor_id,
      actor_role: row.log_actor_role || 'unknown',
      actor_name: row.log_actor_name,
      actor_email: row.log_actor_email,
      action: row.log_action,
      target: row.log_target,
      target_id: row.log_target_id,
      organization_id: row.log_organization_id,
      timestamp: row.log_timestamp,
      metadata: row.log_metadata || {},
    }));

    // CSV export for compliance reports
    if (format === 'csv') {
      const csvHeaders = ['ID', 'Timestamp', 'Actor ID', 'Actor Role', 'Actor Name', 'Actor Email', 'Action', 'Target', 'Target ID', 'Metadata'];
      const csvRows = formattedLogs.map(log => [
        log.id,
        log.timestamp,
        log.actor_id,
        log.actor_role,
        log.actor_name || '',
        log.actor_email || '',
        log.action,
        log.target,
        log.target_id,
        JSON.stringify(log.metadata),
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
      
      const csv = [csvHeaders.join(','), ...csvRows].join('\n');
      
      return new Response(csv, {
        headers: {
          ...getCorsHeaders(),
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.csv`,
        },
      });
    }

    // JSON response
    const response: AuditLogResponse = {
      logs: formattedLogs,
      total: formattedLogs.length,
      page,
      pageSize,
      hasMore,
    };

    console.log(`Audit logs fetched by ${userRole} (${user.id}): ${formattedLogs.length} entries`);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Audit logs endpoint error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } }
    );
  }
});
