/**
 * Role-Based Access Control (RBAC) Permissions
 * 
 * AUTHORIZATION MATRIX:
 * ┌─────────────────────────┬─────────────┬───────────┬────────────┬─────────┐
 * │ Action                  │ super_admin │ admin     │ viewer     │ student │
 * ├─────────────────────────┼─────────────┼───────────┼────────────┼─────────┤
 * │ View Policies           │ ✓           │ ✓         │ ✓          │ ✓*      │
 * │ Create/Edit Policies    │ ✓           │ ✓         │ ✗          │ ✗       │
 * │ Delete Policies         │ ✓           │ ✓         │ ✗          │ ✗       │
 * │ View Audit Logs         │ ✓           │ ✓         │ ✓          │ ✗       │
 * │ Export Audit Logs       │ ✓           │ ✓         │ ✓          │ ✗       │
 * │ View Enforcement Stats  │ ✓           │ ✓         │ ✓          │ ✗       │
 * │ Change Enforcement      │ ✓           │ ✗         │ ✗          │ ✗       │
 * │ View Tamper Events      │ ✓           │ ✓         │ ✓          │ ✗       │
 * │ Resolve Tamper Events   │ ✓           │ ✓         │ ✗          │ ✗       │
 * │ Manage AI Services      │ ✓           │ ✓         │ ✗          │ ✗       │
 * │ Invite Admins           │ ✓           │ ✓         │ ✗          │ ✗       │
 * │ Change User Roles       │ ✓           │ ✓**       │ ✗          │ ✗       │
 * │ Delete Users            │ ✓           │ ✗         │ ✗          │ ✗       │
 * │ Toggle Pilot Mode       │ ✓           │ ✗         │ ✗          │ ✗       │
 * │ Change Logging Settings │ ✓           │ ✗         │ ✗          │ ✗       │
 * └─────────────────────────┴─────────────┴───────────┴────────────┴─────────┘
 * 
 * * Students can only view policies assigned to them
 * ** Admins can only assign roles lower than their own (viewer, student)
 * 
 * IMPORTANT: Viewer role is READ-ONLY. They can view but cannot create/edit/delete.
 * All mutations are blocked server-side for viewer role.
 */

export type AppRole = 'super_admin' | 'admin' | 'viewer' | 'student';

export interface Permissions {
  // Read permissions
  canViewPolicies: boolean;
  canViewAuditLogs: boolean;
  canViewTamperEvents: boolean;
  canViewEnforcementStats: boolean;
  
  // Write permissions (mutations)
  canManagePolicies: boolean;
  canManageAiServices: boolean;
  canManageEnforcement: boolean;
  canManageRoles: boolean;
  canManageTamperEvents: boolean;
  canTogglePilotMode: boolean;
  canDeleteUsers: boolean;
  canChangeLoggingSettings: boolean;
  canInviteAdmins: boolean;
  
  // Meta permissions
  isReadOnly: boolean;
  canMutate: boolean;
}

export const getPermissions = (role: AppRole | null): Permissions => {
  const basePermissions: Permissions = {
    // Read - default false
    canViewPolicies: false,
    canViewAuditLogs: false,
    canViewTamperEvents: false,
    canViewEnforcementStats: false,
    
    // Write - default false
    canManagePolicies: false,
    canManageAiServices: false,
    canManageEnforcement: false,
    canManageRoles: false,
    canManageTamperEvents: false,
    canTogglePilotMode: false,
    canDeleteUsers: false,
    canChangeLoggingSettings: false,
    canInviteAdmins: false,
    
    // Meta
    isReadOnly: true,
    canMutate: false,
  };

  switch (role) {
    case 'super_admin':
      return {
        // Full read access
        canViewPolicies: true,
        canViewAuditLogs: true,
        canViewTamperEvents: true,
        canViewEnforcementStats: true,
        
        // Full write access
        canManagePolicies: true,
        canManageAiServices: true,
        canManageEnforcement: true,
        canManageRoles: true,
        canManageTamperEvents: true,
        canTogglePilotMode: true,
        canDeleteUsers: true,
        canChangeLoggingSettings: true,
        canInviteAdmins: true,
        
        // Meta
        isReadOnly: false,
        canMutate: true,
      };
      
    case 'admin':
      return {
        // Full read access
        canViewPolicies: true,
        canViewAuditLogs: true,
        canViewTamperEvents: true,
        canViewEnforcementStats: true,
        
        // Limited write access
        canManagePolicies: true,
        canManageAiServices: true,
        canManageEnforcement: false, // Super Admin only
        canManageRoles: false, // Super Admin only (can invite but not change roles directly)
        canManageTamperEvents: true,
        canTogglePilotMode: false, // Super Admin only
        canDeleteUsers: false, // Super Admin only
        canChangeLoggingSettings: false, // Super Admin only
        canInviteAdmins: true, // Can invite viewers and below
        
        // Meta
        isReadOnly: false,
        canMutate: true,
      };
      
    case 'viewer':
      // READ-ONLY ADMIN - Can view everything admins can, but cannot mutate
      return {
        // Full read access (same as admin)
        canViewPolicies: true,
        canViewAuditLogs: true,
        canViewTamperEvents: true,
        canViewEnforcementStats: true,
        
        // NO write access - viewer is read-only
        canManagePolicies: false,
        canManageAiServices: false,
        canManageEnforcement: false,
        canManageRoles: false,
        canManageTamperEvents: false,
        canTogglePilotMode: false,
        canDeleteUsers: false,
        canChangeLoggingSettings: false,
        canInviteAdmins: false,
        
        // Meta - explicitly read-only
        isReadOnly: true,
        canMutate: false,
      };
      
    case 'student':
      return {
        // Limited read access
        canViewPolicies: true, // Only their assigned policies
        canViewAuditLogs: false,
        canViewTamperEvents: false,
        canViewEnforcementStats: false,
        
        // No write access
        canManagePolicies: false,
        canManageAiServices: false,
        canManageEnforcement: false,
        canManageRoles: false,
        canManageTamperEvents: false,
        canTogglePilotMode: false,
        canDeleteUsers: false,
        canChangeLoggingSettings: false,
        canInviteAdmins: false,
        
        // Meta
        isReadOnly: true,
        canMutate: false,
      };
      
    default:
      return basePermissions;
  }
};

export const getRoleLabel = (role: AppRole | null): string => {
  switch (role) {
    case 'super_admin': return 'Super Admin';
    case 'admin': return 'Admin';
    case 'viewer': return 'Viewer (Read-Only)';
    case 'student': return 'Student';
    default: return 'Unknown';
  }
};

export const getRoleBadgeColor = (role: AppRole | null): string => {
  switch (role) {
    case 'super_admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
    case 'admin': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'viewer': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    case 'student': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    default: return 'bg-muted text-muted-foreground';
  }
};

/**
 * Checks if user is an admin (super_admin or admin)
 * Does NOT include viewer - viewer is read-only
 */
export const isAdminRole = (role: AppRole | null): boolean => {
  return role === 'super_admin' || role === 'admin';
};

/**
 * Checks if user has any admin-level view access (includes viewer)
 */
export const hasAdminViewAccess = (role: AppRole | null): boolean => {
  return role === 'super_admin' || role === 'admin' || role === 'viewer';
};

/**
 * Checks if user can perform mutations (create/edit/delete)
 * Viewer role is explicitly excluded
 */
export const canPerformMutations = (role: AppRole | null): boolean => {
  return role === 'super_admin' || role === 'admin';
};

/**
 * Checks if user is read-only (viewer or student)
 */
export const isReadOnlyRole = (role: AppRole | null): boolean => {
  return role === 'viewer' || role === 'student' || role === null;
};
