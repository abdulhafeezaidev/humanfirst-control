/**
 * Multi-Tenant Query Security Utility
 * 
 * CRITICAL: All database queries MUST be scoped by organization_id.
 * This utility provides safe query helpers that enforce tenant isolation.
 * 
 * NO GLOBAL QUERIES ALLOWED - Every query must be organization-scoped.
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Get the current user's organization ID
 * FAILS LOUDLY if organization is not set
 */
export async function getCurrentOrganizationId(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error) {
    throw new Error(`Failed to fetch organization: ${error.message}`);
  }
  
  if (!data?.organization_id) {
    throw new Error('User is not associated with any organization. Multi-tenant isolation requires organization context.');
  }
  
  return data.organization_id;
}

/**
 * Validates that organization_id is present before executing a query
 * FAILS LOUDLY if organization_id is null/undefined
 */
export function requireOrganizationId(orgId: string | null | undefined, context: string = 'Query'): asserts orgId is string {
  if (!orgId) {
    throw new Error(`${context}: organization_id is required for multi-tenant security. Cannot execute query without tenant context.`);
  }
}

/**
 * Safe query builders that enforce organization scoping
 */
export const secureQueries = {
  /**
   * Fetch policies scoped to organization
   */
  async fetchPolicies(organizationId: string) {
    requireOrganizationId(organizationId, 'fetchPolicies');
    
    return supabase
      .from('exam_policies')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
  },

  /**
   * Fetch students (profiles with student role) scoped to organization
   */
  async fetchStudents(organizationId: string) {
    requireOrganizationId(organizationId, 'fetchStudents');
    
    // First get student role user_ids in the organization
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, full_name, email, created_at')
      .eq('organization_id', organizationId);
    
    if (profileError) {
      throw new Error(`Failed to fetch profiles: ${profileError.message}`);
    }
    
    if (!profiles || profiles.length === 0) {
      return { data: [], error: null };
    }
    
    // Filter to only students
    const userIds = profiles.map(p => p.user_id);
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', userIds)
      .eq('role', 'student');
    
    if (roleError) {
      throw new Error(`Failed to fetch roles: ${roleError.message}`);
    }
    
    const studentUserIds = new Set((roles || []).map(r => r.user_id));
    const students = profiles.filter(p => studentUserIds.has(p.user_id));
    
    return { data: students, error: null };
  },

  /**
   * Fetch admins scoped to organization
   */
  async fetchAdmins(organizationId: string) {
    requireOrganizationId(organizationId, 'fetchAdmins');
    
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, full_name, email, created_at')
      .eq('organization_id', organizationId);
    
    if (profileError) {
      throw new Error(`Failed to fetch profiles: ${profileError.message}`);
    }
    
    if (!profiles || profiles.length === 0) {
      return { data: [], error: null };
    }
    
    const userIds = profiles.map(p => p.user_id);
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', userIds)
      .in('role', ['super_admin', 'admin', 'viewer']);
    
    if (roleError) {
      throw new Error(`Failed to fetch roles: ${roleError.message}`);
    }
    
    const roleMap = new Map((roles || []).map(r => [r.user_id, r.role]));
    const admins = profiles
      .filter(p => roleMap.has(p.user_id))
      .map(p => ({ ...p, role: roleMap.get(p.user_id) }));
    
    return { data: admins, error: null };
  },

  /**
   * Fetch enforcement config scoped to organization
   */
  async fetchEnforcementConfig(organizationId: string) {
    requireOrganizationId(organizationId, 'fetchEnforcementConfig');
    
    return supabase
      .from('enforcement_config')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();
  },

  /**
   * Fetch audit logs scoped to organization
   */
  async fetchAuditLogs(organizationId: string, limit: number = 50) {
    requireOrganizationId(organizationId, 'fetchAuditLogs');
    
    return supabase
      .from('audit_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('timestamp', { ascending: false })
      .limit(limit);
  },

  /**
   * Fetch tamper events scoped to organization
   */
  async fetchTamperEvents(organizationId: string, limit: number = 50) {
    requireOrganizationId(organizationId, 'fetchTamperEvents');
    
    return supabase
      .from('tamper_events')
      .select('*')
      .eq('organization_id', organizationId)
      .order('timestamp', { ascending: false })
      .limit(limit);
  },

  /**
   * Fetch policy assignments scoped to organization
   */
  async fetchPolicyAssignments(organizationId: string, policyId?: string) {
    requireOrganizationId(organizationId, 'fetchPolicyAssignments');
    
    let query = supabase
      .from('policy_assignments')
      .select('*')
      .eq('organization_id', organizationId)
      .is('revoked_at', null);
    
    if (policyId) {
      query = query.eq('policy_id', policyId);
    }
    
    return query;
  },

  /**
   * Fetch admin invitations scoped to organization
   */
  async fetchAdminInvitations(organizationId: string) {
    requireOrganizationId(organizationId, 'fetchAdminInvitations');
    
    return supabase
      .from('admin_invitations')
      .select('*')
      .eq('organization_id', organizationId)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
  },
};

/**
 * Safe insert/update helpers that require organization_id
 */
export const secureMutations = {
  /**
   * Create a policy with required organization_id
   */
  async createPolicy(organizationId: string, userId: string, policyData: {
    title: string;
    description?: string | null;
    policy_type: 'exam' | 'focus' | 'custom';
    enforcement_level: 'strict' | 'soft';
    assignment_type: 'institution' | 'individual';
    start_time: string;
    end_time: string;
    blocked_categories: string[];
    blocked_services: string[];
    priority?: number;
  }) {
    requireOrganizationId(organizationId, 'createPolicy');
    
    return supabase
      .from('exam_policies')
      .insert({
        title: policyData.title,
        description: policyData.description || null,
        policy_type: policyData.policy_type,
        enforcement_level: policyData.enforcement_level,
        assignment_type: policyData.assignment_type,
        start_time: policyData.start_time,
        end_time: policyData.end_time,
        blocked_categories: policyData.blocked_categories,
        blocked_services: policyData.blocked_services,
        priority: policyData.priority,
        organization_id: organizationId,
        created_by: userId,
        is_active: true,
      })
      .select()
      .single();
  },

  /**
   * Update policy with organization check
   */
  async updatePolicy(organizationId: string, policyId: string, updates: Record<string, unknown>) {
    requireOrganizationId(organizationId, 'updatePolicy');
    
    return supabase
      .from('exam_policies')
      .update(updates)
      .eq('id', policyId)
      .eq('organization_id', organizationId); // Double-check org ownership
  },

  /**
   * Delete policy with organization check
   */
  async deletePolicy(organizationId: string, policyId: string) {
    requireOrganizationId(organizationId, 'deletePolicy');
    
    return supabase
      .from('exam_policies')
      .delete()
      .eq('id', policyId)
      .eq('organization_id', organizationId); // Double-check org ownership
  },

  /**
   * Create tamper event with organization_id
   */
  async createTamperEvent(organizationId: string, eventData: {
    user_id: string;
    device_id: string;
    event_type: string;
    exam_policy_id?: string;
  }) {
    requireOrganizationId(organizationId, 'createTamperEvent');
    
    return supabase
      .from('tamper_events')
      .insert({
        ...eventData,
        organization_id: organizationId,
      });
  },

  /**
   * Resolve tamper event with organization check
   */
  async resolveTamperEvent(organizationId: string, eventId: string, userId: string) {
    requireOrganizationId(organizationId, 'resolveTamperEvent');
    
    return supabase
      .from('tamper_events')
      .update({ 
        resolved: true, 
        resolved_at: new Date().toISOString(), 
        resolved_by: userId 
      })
      .eq('id', eventId)
      .eq('organization_id', organizationId); // Double-check org ownership
  },

  /**
   * Update enforcement config with organization check
   */
  async updateEnforcementConfig(organizationId: string, updates: Record<string, unknown>) {
    requireOrganizationId(organizationId, 'updateEnforcementConfig');
    
    return supabase
      .from('enforcement_config')
      .update(updates)
      .eq('organization_id', organizationId);
  },

  /**
   * Create policy assignment with organization_id
   */
  async createPolicyAssignment(organizationId: string, assignmentData: {
    policy_id: string;
    user_id: string;
    assigned_by: string;
    notes?: string;
  }) {
    requireOrganizationId(organizationId, 'createPolicyAssignment');
    
    return supabase
      .from('policy_assignments')
      .insert({
        ...assignmentData,
        organization_id: organizationId,
      });
  },
};

/**
 * Type guard to check if a query result has data
 */
export function hasData<T>(result: { data: T | null; error: unknown }): result is { data: T; error: null } {
  return result.data !== null && !result.error;
}
