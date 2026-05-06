/**
 * Frontend API Authentication Utilities
 * 
 * Provides role-aware API call wrappers that:
 * 1. Validate user is authenticated before making requests
 * 2. Ensure role matches expected access level
 * 3. Fail loudly if authentication is missing or role is insufficient
 * 
 * IMPORTANT: These are CLIENT-SIDE convenience wrappers.
 * Real security is enforced by RLS policies and edge function auth.
 */

import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'super_admin' | 'admin' | 'viewer' | 'student';

export interface AuthenticatedCallOptions {
  requiredRoles?: AppRole[];
  errorMessage?: string;
}

export class AuthenticationError extends Error {
  constructor(message: string, public code: 'NO_SESSION' | 'NO_ROLE' | 'INSUFFICIENT_ROLE') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Gets the current user's role from the database
 * NEVER trust client-side role storage - always verify with backend
 */
export async function getCurrentRole(): Promise<AppRole | null> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return null;
  }

  const { data, error } = await supabase.rpc('get_user_role', {
    _user_id: session.user.id,
  });

  if (error || !data) {
    console.error('Failed to fetch user role:', error);
    return null;
  }

  return data as AppRole;
}

/**
 * Gets current user's organization ID from the database
 */
export async function getCurrentOrganizationId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.organization_id;
}

/**
 * Validates that the current user has one of the required roles
 * Throws AuthenticationError if validation fails
 */
export async function validateRole(requiredRoles: AppRole[]): Promise<{ userId: string; role: AppRole }> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    throw new AuthenticationError(
      'You must be logged in to perform this action',
      'NO_SESSION'
    );
  }

  const role = await getCurrentRole();
  
  if (!role) {
    throw new AuthenticationError(
      'Your account has no assigned role',
      'NO_ROLE'
    );
  }

  if (!requiredRoles.includes(role)) {
    throw new AuthenticationError(
      `Access denied. Required role: ${requiredRoles.join(' or ')}. Your role: ${role}`,
      'INSUFFICIENT_ROLE'
    );
  }

  return { userId: session.user.id, role };
}

/**
 * Wrapper for admin-only operations
 * Validates role before executing the callback
 */
export async function withAdminAuth<T>(
  callback: (auth: { userId: string; role: AppRole }) => Promise<T>
): Promise<T> {
  const auth = await validateRole(['super_admin', 'admin']);
  return callback(auth);
}

/**
 * Wrapper for super-admin-only operations
 */
export async function withSuperAdminAuth<T>(
  callback: (auth: { userId: string; role: AppRole }) => Promise<T>
): Promise<T> {
  const auth = await validateRole(['super_admin']);
  return callback(auth);
}

/**
 * Wrapper for student-only operations
 */
export async function withStudentAuth<T>(
  callback: (auth: { userId: string; role: AppRole }) => Promise<T>
): Promise<T> {
  const auth = await validateRole(['student']);
  return callback(auth);
}

/**
 * Wrapper for viewer+ operations (viewer, admin, super_admin)
 */
export async function withViewerAuth<T>(
  callback: (auth: { userId: string; role: AppRole }) => Promise<T>
): Promise<T> {
  const auth = await validateRole(['super_admin', 'admin', 'viewer']);
  return callback(auth);
}

/**
 * Calls an edge function with proper authentication
 * Automatically includes the user's JWT token
 */
export async function callEdgeFunction<T = unknown>(
  functionName: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: Record<string, unknown>;
    requiredRoles?: AppRole[];
  } = {}
): Promise<T> {
  const { method = 'POST', body, requiredRoles } = options;

  // Validate role if required
  if (requiredRoles && requiredRoles.length > 0) {
    await validateRole(requiredRoles);
  }

  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new AuthenticationError(
      'You must be logged in to call this function',
      'NO_SESSION'
    );
  }

  const { data, error } = await supabase.functions.invoke(functionName, {
    method,
    body,
  });

  if (error) {
    throw error;
  }

  return data as T;
}

/**
 * Helper to check if user has admin privileges
 */
export function isAdminRole(role: AppRole | null): boolean {
  return role === 'super_admin' || role === 'admin';
}

/**
 * Helper to check if user can view admin content
 */
export function canViewAdminContent(role: AppRole | null): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'viewer';
}
