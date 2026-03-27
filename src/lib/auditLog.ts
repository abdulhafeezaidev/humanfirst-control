/**
 * Tamper-Resistant Audit Log Utility
 * 
 * Provides consistent, immutable logging for all admin actions.
 * Logs are stored server-side and cannot be modified or deleted by users.
 */

import { supabase } from '@/integrations/supabase/client';

export type AuditAction = 
  // Policy actions
  | 'exam_policy_created'
  | 'exam_policy_updated'
  | 'exam_policy_activated'
  | 'exam_policy_deactivated'
  | 'exam_policy_deleted'
  // Admin actions
  | 'admin_invited'
  | 'admin_invitation_used'
  | 'role_changed'
  | 'role_deleted'
  // AI service actions
  | 'ai_service_blocked'
  | 'ai_service_unblocked'
  // Enforcement actions
  | 'enforcement_status_changed'
  | 'pilot_mode_enabled'
  | 'pilot_mode_disabled'
  | 'policy_sharing_enabled'
  | 'policy_sharing_disabled'
  // Institution actions
  | 'institution_created'
  | 'institution_settings_updated'
  // Student actions
  | 'student_enrolled'
  | 'student_removed'
  | 'policy_assigned'
  | 'policy_revoked'
  // Custom action
  | string;

export type AuditTarget = 
  | 'exam_policies'
  | 'user_roles'
  | 'admin_invitations'
  | 'ai_services'
  | 'enforcement_config'
  | 'organizations'
  | 'profiles'
  | 'policy_assignments'
  | string;

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorRole: string;
  actorName?: string;
  actorEmail?: string;
  action: AuditAction;
  target: AuditTarget;
  targetId: string;
  organizationId: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AuditLogMetadata = Record<string, any>;

export interface AuditLogStats {
  totalLogs: number;
  logsToday: number;
  logsThisWeek: number;
  topActions: Array<{ action: string; count: number }>;
}

export interface AuditLogFilters {
  actionFilter?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Log a custom admin action using the database RPC
 * This is for actions not covered by automatic database triggers
 */
export async function logAdminAction(
  action: AuditAction,
  target: AuditTarget,
  targetId: string,
  metadata: AuditLogMetadata = {}
): Promise<{ success: boolean; logId?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('log_admin_action', {
      p_action: action,
      p_target: target,
      p_target_id: targetId,
      p_metadata: metadata as unknown as Record<string, never>,
    });

    if (error) {
      console.error('Failed to log admin action:', error);
      return { success: false, error: error.message };
    }

    return { success: true, logId: data };
  } catch (err) {
    console.error('Audit log error:', err);
    return { success: false, error: 'Failed to create audit log' };
  }
}

/**
 * Fetch audit logs with optional filtering
 * Only accessible by admins, viewers, and super_admins
 */
export async function fetchAuditLogs(
  filters: AuditLogFilters = {}
): Promise<{ logs: AuditLogEntry[]; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('get_audit_logs_with_details', {
      p_limit: filters.limit ?? 100,
      p_offset: filters.offset ?? 0,
      p_action_filter: filters.actionFilter ?? null,
      p_start_date: filters.startDate?.toISOString() ?? null,
      p_end_date: filters.endDate?.toISOString() ?? null,
    });

    if (error) {
      console.error('Failed to fetch audit logs:', error);
      return { logs: [], error: error.message };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logs: AuditLogEntry[] = (data || []).map((row: any) => ({
      id: row.log_id,
      actorId: row.log_actor_id,
      action: row.log_action,
      target: row.log_target,
      targetId: row.log_target_id,
      organizationId: row.log_organization_id,
      timestamp: new Date(row.log_timestamp),
      metadata: (row.log_metadata as Record<string, unknown>) || {},
      actorRole: row.log_actor_role || 'unknown',
      actorName: row.log_actor_name,
      actorEmail: row.log_actor_email,
    }));

    return { logs };
  } catch (err) {
    console.error('Audit log fetch error:', err);
    return { logs: [], error: 'Failed to fetch audit logs' };
  }
}

/**
 * Get audit log statistics for dashboard display
 */
export async function fetchAuditLogStats(): Promise<{ stats: AuditLogStats | null; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('get_audit_log_stats');

    if (error) {
      console.error('Failed to fetch audit stats:', error);
      return { stats: null, error: error.message };
    }

    if (!data || data.length === 0) {
      return { stats: null };
    }

    const row = data[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topActions = Array.isArray(row.top_actions) 
      ? row.top_actions.map((a: any) => ({ action: a.action, count: a.count }))
      : [];
      
    return {
      stats: {
        totalLogs: row.total_logs || 0,
        logsToday: row.logs_today || 0,
        logsThisWeek: row.logs_this_week || 0,
        topActions,
      },
    };
  } catch (err) {
    console.error('Audit stats fetch error:', err);
    return { stats: null, error: 'Failed to fetch audit statistics' };
  }
}

/**
 * Format an audit action for display
 */
export function formatAuditAction(action: AuditAction): string {
  const actionMap: Record<string, string> = {
    exam_policy_created: 'Created Policy',
    exam_policy_updated: 'Updated Policy',
    exam_policy_activated: 'Activated Policy',
    exam_policy_deactivated: 'Deactivated Policy',
    exam_policy_deleted: 'Deleted Policy',
    admin_invited: 'Invited Admin',
    admin_invitation_used: 'Accepted Invitation',
    role_changed: 'Changed Role',
    role_deleted: 'Deleted Role',
    ai_service_blocked: 'Blocked AI Service',
    ai_service_unblocked: 'Unblocked AI Service',
    enforcement_status_changed: 'Changed Enforcement Status',
    pilot_mode_enabled: 'Enabled Pilot Mode',
    pilot_mode_disabled: 'Disabled Pilot Mode',
    policy_sharing_enabled: 'Enabled Policy Sharing',
    policy_sharing_disabled: 'Disabled Policy Sharing',
    institution_created: 'Created Institution',
    institution_settings_updated: 'Updated Institution Settings',
    student_enrolled: 'Enrolled Student',
    student_removed: 'Removed Student',
    policy_assigned: 'Assigned Policy',
    policy_revoked: 'Revoked Policy',
  };
  
  return actionMap[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Get the severity level of an audit action
 */
export function getAuditActionSeverity(action: AuditAction): 'info' | 'warning' | 'critical' {
  const criticalActions = ['role_deleted', 'exam_policy_deleted', 'student_removed'];
  const warningActions = ['role_changed', 'enforcement_status_changed', 'exam_policy_deactivated'];
  
  if (criticalActions.includes(action)) return 'critical';
  if (warningActions.includes(action)) return 'warning';
  return 'info';
}

/**
 * Action categories for filtering
 */
export const AUDIT_ACTION_CATEGORIES = {
  policy: [
    'exam_policy_created',
    'exam_policy_updated', 
    'exam_policy_activated',
    'exam_policy_deactivated',
    'exam_policy_deleted',
    'policy_assigned',
    'policy_revoked',
  ],
  admin: [
    'admin_invited',
    'admin_invitation_used',
    'role_changed',
    'role_deleted',
  ],
  enforcement: [
    'enforcement_status_changed',
    'pilot_mode_enabled',
    'pilot_mode_disabled',
    'policy_sharing_enabled',
    'policy_sharing_disabled',
  ],
  student: [
    'student_enrolled',
    'student_removed',
  ],
  service: [
    'ai_service_blocked',
    'ai_service_unblocked',
  ],
  institution: [
    'institution_created',
    'institution_settings_updated',
  ],
} as const;
