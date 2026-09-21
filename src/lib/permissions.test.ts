import { describe, it, expect } from 'vitest';
import { 
  getPermissions, 
  getRoleLabel, 
  isAdminRole, 
  hasAdminViewAccess, 
  canPerformMutations, 
  isReadOnlyRole 
} from './permissions';

describe('Permissions Library', () => {
  describe('getPermissions', () => {
    it('grants full access to super_admin', () => {
      const perms = getPermissions('super_admin');
      expect(perms.canViewPolicies).toBe(true);
      expect(perms.canManageRoles).toBe(true);
      expect(perms.canDeleteUsers).toBe(true);
      expect(perms.isReadOnly).toBe(false);
      expect(perms.canMutate).toBe(true);
    });

    it('grants limited admin access to admin', () => {
      const perms = getPermissions('admin');
      expect(perms.canViewPolicies).toBe(true);
      expect(perms.canManagePolicies).toBe(true);
      expect(perms.canManageRoles).toBe(false); // Only super_admin
      expect(perms.canDeleteUsers).toBe(false); // Only super_admin
      expect(perms.isReadOnly).toBe(false);
      expect(perms.canMutate).toBe(true);
    });

    it('grants read-only access to viewer', () => {
      const perms = getPermissions('viewer');
      expect(perms.canViewPolicies).toBe(true);
      expect(perms.canViewAuditLogs).toBe(true);
      expect(perms.canManagePolicies).toBe(false);
      expect(perms.isReadOnly).toBe(true);
      expect(perms.canMutate).toBe(false);
    });

    it('grants restricted access to student', () => {
      const perms = getPermissions('student');
      expect(perms.canViewPolicies).toBe(true);
      expect(perms.canViewAuditLogs).toBe(false);
      expect(perms.canManagePolicies).toBe(false);
      expect(perms.isReadOnly).toBe(true);
      expect(perms.canMutate).toBe(false);
    });
    
    it('returns default restricted permissions for null', () => {
      const perms = getPermissions(null);
      expect(perms.canViewPolicies).toBe(false);
      expect(perms.isReadOnly).toBe(true);
      expect(perms.canMutate).toBe(false);
    });
  });

  describe('getRoleLabel', () => {
    it('returns correct labels', () => {
      expect(getRoleLabel('super_admin')).toBe('Super Admin');
      expect(getRoleLabel('admin')).toBe('Admin');
      expect(getRoleLabel('viewer')).toBe('Viewer (Read-Only)');
      expect(getRoleLabel('student')).toBe('Student');
      expect(getRoleLabel(null)).toBe('Unknown');
    });
  });

  describe('Role Check Helpers', () => {
    it('isAdminRole', () => {
      expect(isAdminRole('super_admin')).toBe(true);
      expect(isAdminRole('admin')).toBe(true);
      expect(isAdminRole('viewer')).toBe(false);
      expect(isAdminRole('student')).toBe(false);
      expect(isAdminRole(null)).toBe(false);
    });

    it('hasAdminViewAccess', () => {
      expect(hasAdminViewAccess('super_admin')).toBe(true);
      expect(hasAdminViewAccess('admin')).toBe(true);
      expect(hasAdminViewAccess('viewer')).toBe(true);
      expect(hasAdminViewAccess('student')).toBe(false);
      expect(hasAdminViewAccess(null)).toBe(false);
    });

    it('canPerformMutations', () => {
      expect(canPerformMutations('super_admin')).toBe(true);
      expect(canPerformMutations('admin')).toBe(true);
      expect(canPerformMutations('viewer')).toBe(false);
      expect(canPerformMutations('student')).toBe(false);
      expect(canPerformMutations(null)).toBe(false);
    });

    it('isReadOnlyRole', () => {
      expect(isReadOnlyRole('super_admin')).toBe(false);
      expect(isReadOnlyRole('admin')).toBe(false);
      expect(isReadOnlyRole('viewer')).toBe(true);
      expect(isReadOnlyRole('student')).toBe(true);
      expect(isReadOnlyRole(null)).toBe(true);
    });
  });
});
