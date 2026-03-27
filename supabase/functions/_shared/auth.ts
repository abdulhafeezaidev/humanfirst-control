/**
 * Shared authentication utilities for Edge Functions
 * Validates JWT tokens and enforces role-based access control
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export type AppRole = 'super_admin' | 'admin' | 'viewer' | 'student';

export interface AuthResult {
  userId: string;
  role: AppRole;
  organizationId: string | null;
  email: string | null;
}

export interface AuthError {
  error: string;
  status: number;
}

/**
 * Validates JWT and returns user claims including role and organization
 * Role is ALWAYS fetched from database, never from JWT claims
 */
export async function validateAuth(req: Request): Promise<AuthResult | AuthError> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing or invalid authorization header', status: 401 };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  // Create client with user's auth token
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  // Verify JWT by getting the user - this validates the token
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    console.error('JWT validation failed:', userError);
    return { error: 'Invalid or expired token', status: 401 };
  }

  const userId = user.id;
  const email = user.email || null;

  // CRITICAL: Fetch role from database, not JWT
  // This ensures role changes take effect immediately
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (roleError) {
    console.error('Failed to fetch user role:', roleError);
    return { error: 'Failed to verify user role', status: 500 };
  }

  if (!roleData) {
    return { error: 'User has no assigned role', status: 403 };
  }

  // Fetch organization ID from profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', userId)
    .maybeSingle();

  return {
    userId,
    role: roleData.role as AppRole,
    organizationId: profileData?.organization_id || null,
    email,
  };
}

/**
 * Checks if the authenticated user has admin access (super_admin or admin)
 * IMPORTANT: This grants MUTATION access. Viewers are explicitly excluded.
 */
export function isAdmin(role: AppRole): boolean {
  return role === 'super_admin' || role === 'admin';
}

/**
 * Checks if the authenticated user has any admin-level access (including viewer)
 * Use this for READ-ONLY operations only
 */
export function isAdminOrViewer(role: AppRole): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'viewer';
}

/**
 * Checks if the authenticated user is a super admin
 */
export function isSuperAdmin(role: AppRole): boolean {
  return role === 'super_admin';
}

/**
 * Checks if the authenticated user can perform mutations (excludes viewer)
 * Viewer role is READ-ONLY and cannot create/edit/delete anything
 */
export function canMutate(role: AppRole): boolean {
  return role === 'super_admin' || role === 'admin';
}

/**
 * Checks if user is a viewer (read-only admin)
 */
export function isViewer(role: AppRole): boolean {
  return role === 'viewer';
}

/**
 * Returns an unauthorized response with proper CORS headers
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Returns a forbidden response with proper CORS headers
 */
export function forbiddenResponse(message: string = 'Forbidden'): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Middleware helper to require specific roles
 * Returns null if authorized, or an error Response if not
 */
export async function requireRole(
  req: Request, 
  allowedRoles: AppRole[]
): Promise<{ auth: AuthResult } | { response: Response }> {
  const authResult = await validateAuth(req);
  
  if ('error' in authResult) {
    return { 
      response: new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    };
  }

  if (!allowedRoles.includes(authResult.role)) {
    return { 
      response: forbiddenResponse(`Access denied. Required role: ${allowedRoles.join(' or ')}`) 
    };
  }

  return { auth: authResult };
}

/**
 * Require admin access (super_admin or admin only) - for MUTATIONS
 * Viewers are explicitly blocked from mutation endpoints
 */
export async function requireAdmin(req: Request): Promise<{ auth: AuthResult } | { response: Response }> {
  return requireRole(req, ['super_admin', 'admin']);
}

/**
 * Require read-only admin access (viewer, admin, or super_admin)
 * Use this for READ-ONLY endpoints like viewing audit logs, policies, stats
 */
export async function requireAdminOrViewer(req: Request): Promise<{ auth: AuthResult } | { response: Response }> {
  return requireRole(req, ['super_admin', 'admin', 'viewer']);
}

/**
 * Require super admin access only
 */
export async function requireSuperAdmin(req: Request): Promise<{ auth: AuthResult } | { response: Response }> {
  return requireRole(req, ['super_admin']);
}

/**
 * Require student access
 */
export async function requireStudent(req: Request): Promise<{ auth: AuthResult } | { response: Response }> {
  return requireRole(req, ['student']);
}

/**
 * Returns a read-only access denied response
 */
export function readOnlyResponse(): Response {
  return new Response(
    JSON.stringify({ 
      error: 'Access denied: Your role (viewer) is read-only and cannot perform mutations',
      code: 'READ_ONLY_ROLE'
    }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
