/**
 * Admin Hierarchy Utilities
 * 
 * Frontend utilities for admin role management.
 * NOTE: These are UX helpers only - all security is enforced server-side.
 */

import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'super_admin' | 'admin' | 'viewer' | 'student';

export const ROLE_HIERARCHY: Record<AppRole, number> = {
  super_admin: 100,
  admin: 50,
  viewer: 25,
  student: 10,
};

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Super Admin (Owner)',
  admin: 'Admin',
  viewer: 'Viewer',
  student: 'Student',
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  super_admin: 'Full control over the organization. Can manage all roles and settings.',
  admin: 'Can manage policies, schedules, and view all data. Cannot modify super admins.',
  viewer: 'Read-only access to policies, logs, and reports.',
  student: 'Subject to policies. Can view their own transparency data.',
};

export interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: AppRole;
  created_at: string;
  organization_id: string | null;
}

export interface RoleChangeResult {
  success: boolean;
  error?: string;
  old_role?: AppRole;
  new_role?: AppRole;
}

export interface HierarchyInfo {
  roles: Array<{
    name: AppRole;
    level: number;
    label: string;
    description: string;
  }>;
  current_user: {
    user_id: string;
    role: AppRole;
    organization_id: string | null;
  };
  capabilities: {
    can_create_super_admin: boolean;
    can_create_admin: boolean;
    can_create_viewer: boolean;
    can_delete_super_admin: boolean;
    can_delete_admin: boolean;
    can_modify_own_role: boolean;
  };
}

/**
 * Check if actor can manage target role (UX helper only)
 */
export function canManageRole(actorRole: AppRole | null, targetRole: AppRole): boolean {
  if (!actorRole) return false;
  
  // Only super_admin can manage super_admin
  if (targetRole === 'super_admin') {
    return actorRole === 'super_admin';
  }
  
  // Actor must have higher or equal level
  return ROLE_HIERARCHY[actorRole] >= ROLE_HIERARCHY[targetRole];
}

/**
 * Check if actor can delete target user (UX helper only)
 */
export function canDeleteUser(actorRole: AppRole | null, targetRole: AppRole, isSelf: boolean): boolean {
  if (!actorRole) return false;
  if (isSelf) return false; // Cannot delete self
  
  return canManageRole(actorRole, targetRole);
}

/**
 * Get roles that an actor can assign
 */
export function getAssignableRoles(actorRole: AppRole | null): AppRole[] {
  if (!actorRole) return [];
  
  if (actorRole === 'super_admin') {
    return ['super_admin', 'admin', 'viewer'];
  }
  
  if (actorRole === 'admin') {
    return ['admin', 'viewer'];
  }
  
  return [];
}

/**
 * Fetch all admins in the organization via edge function
 */
export async function fetchOrganizationAdmins(): Promise<{ admins: AdminUser[]; current_user_id: string; current_role: AppRole }> {
  const { data, error } = await supabase.functions.invoke('admin-management/list');
  
  if (error) {
    throw new Error(error.message || 'Failed to fetch admins');
  }
  
  return data;
}

/**
 * Change a user's role via edge function
 */
export async function changeUserRole(
  targetUserId: string,
  newRole: AppRole,
  reason?: string
): Promise<RoleChangeResult> {
  const { data, error } = await supabase.functions.invoke('admin-management/change-role', {
    method: 'POST',
    body: {
      target_user_id: targetUserId,
      new_role: newRole,
      reason,
    },
  });
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  if (!data.success) {
    return { success: false, error: data.error };
  }
  
  return {
    success: true,
    old_role: data.old_role,
    new_role: data.new_role,
  };
}

/**
 * Delete a user's role via edge function
 */
export async function deleteUserRole(
  targetUserId: string,
  reason?: string
): Promise<RoleChangeResult> {
  const { data, error } = await supabase.functions.invoke('admin-management/delete', {
    method: 'POST',
    body: {
      target_user_id: targetUserId,
      reason,
    },
  });
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  if (!data.success) {
    return { success: false, error: data.error };
  }
  
  return {
    success: true,
    old_role: data.deleted_role,
  };
}

/**
 * Get role hierarchy and current user's capabilities
 */
export async function fetchRoleHierarchy(): Promise<HierarchyInfo> {
  const { data, error } = await supabase.functions.invoke('admin-management/hierarchy');
  
  if (error) {
    throw new Error(error.message || 'Failed to fetch hierarchy');
  }
  
  return data;
}

/**
 * Use the database RPC to change role (alternative to edge function)
 */
export async function changeUserRoleViaRPC(
  targetUserId: string,
  newRole: AppRole,
  reason?: string
): Promise<RoleChangeResult> {
  const { data, error } = await supabase.rpc('change_user_role', {
    p_target_user_id: targetUserId,
    p_new_role: newRole,
    p_reason: reason || null,
  });
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Cast data to expected shape
  const result = data as { success: boolean; error?: string; old_role?: string; new_role?: string } | null;
  
  if (!result?.success) {
    return { success: false, error: result?.error || 'Unknown error' };
  }
  
  return {
    success: true,
    old_role: result.old_role as AppRole,
    new_role: result.new_role as AppRole,
  };
}

/**
 * Use the database RPC to delete role (alternative to edge function)
 */
export async function deleteUserRoleViaRPC(
  targetUserId: string,
  reason?: string
): Promise<RoleChangeResult> {
  const { data, error } = await supabase.rpc('delete_user_role', {
    p_target_user_id: targetUserId,
    p_reason: reason || null,
  });
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Cast data to expected shape
  const result = data as { success: boolean; error?: string; deleted_role?: string } | null;
  
  if (!result?.success) {
    return { success: false, error: result?.error || 'Unknown error' };
  }
  
  return {
    success: true,
    old_role: result.deleted_role as AppRole,
  };
}
