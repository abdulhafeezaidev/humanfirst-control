/**
 * Admin Management Edge Function
 * 
 * Provides secure admin CRUD operations with strict role hierarchy enforcement.
 * All operations are validated server-side - client checks are for UX only.
 * 
 * Hierarchy Rules:
 * 1. OWNER_ADMIN (super_admin) created ONLY at institution onboarding
 * 2. Only super_admin can create/modify other super_admins
 * 3. Admins cannot delete or demote super_admins
 * 4. Users cannot modify their own role
 * 5. At least one super_admin must exist per organization
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { 
  corsHeaders, 
  requireAdmin, 
  requireAdminOrViewer,
  requireSuperAdmin, 
  AuthResult,
  isViewer,
  readOnlyResponse 
} from '../_shared/auth.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Service client for privileged operations
const adminClient = createClient(supabaseUrl, supabaseServiceKey)

interface AdminUser {
  id: string
  user_id: string
  email: string
  full_name: string
  role: string
  created_at: string
  organization_id: string | null
}

interface ChangeRoleRequest {
  target_user_id: string
  new_role: 'admin' | 'viewer' | 'super_admin' | 'student'
  reason?: string
}

interface DeleteUserRequest {
  target_user_id: string
  reason?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()

    switch (action) {
      case 'list':
        return await handleListAdmins(req)
      case 'change-role':
        return await handleChangeRole(req)
      case 'delete':
        return await handleDeleteUser(req)
      case 'hierarchy':
        return await handleGetHierarchy(req)
      default:
        return jsonResponse({ error: 'Unknown action' }, 400)
    }
  } catch (error) {
    console.error('Admin management error:', error)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})

/**
 * List all admins in the organization
 * Requires: viewer, admin, or super_admin role (READ-ONLY)
 */
async function handleListAdmins(req: Request): Promise<Response> {
  // Use requireAdminOrViewer for read-only operations
  const authResult = await requireAdminOrViewer(req)
  if ('response' in authResult) return authResult.response

  const { auth } = authResult

  if (!auth.organizationId) {
    return jsonResponse({ error: 'No organization found' }, 400)
  }

  // Fetch all users in the organization with admin roles
  const { data, error } = await adminClient
    .from('profiles')
    .select(`
      id,
      user_id,
      email,
      full_name,
      organization_id,
      created_at,
      user_roles!inner(role, created_at)
    `)
    .eq('organization_id', auth.organizationId)
    .in('user_roles.role', ['super_admin', 'admin', 'viewer'])
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching admins:', error)
    return jsonResponse({ error: 'Failed to fetch admins' }, 500)
  }

  const admins: AdminUser[] = (data || []).map((profile: any) => ({
    id: profile.id,
    user_id: profile.user_id,
    email: profile.email,
    full_name: profile.full_name,
    role: profile.user_roles[0]?.role || 'unknown',
    created_at: profile.user_roles[0]?.created_at || profile.created_at,
    organization_id: profile.organization_id,
  }))

  return jsonResponse({
    admins,
    current_user_id: auth.userId,
    current_role: auth.role,
  })
}

/**
 * Change a user's role
 * Requires: super_admin for super_admin changes, admin for others
 * BLOCKED: viewer role cannot perform mutations
 */
async function handleChangeRole(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  // First check if user has any admin access
  const authResult = await requireAdminOrViewer(req)
  if ('response' in authResult) return authResult.response

  const { auth } = authResult

  // SECURITY: Block viewer role from mutations
  if (isViewer(auth.role)) {
    console.warn(`Viewer ${auth.userId} attempted role change mutation`)
    return readOnlyResponse()
  }

  const body: ChangeRoleRequest = await req.json()

  // Validate request
  if (!body.target_user_id || !body.new_role) {
    return jsonResponse({ error: 'Missing target_user_id or new_role' }, 400)
  }

  // Use the database function for safe role changes
  const { data, error } = await adminClient.rpc('change_user_role', {
    p_target_user_id: body.target_user_id,
    p_new_role: body.new_role,
    p_reason: body.reason || null,
  })

  if (error) {
    console.error('Role change error:', error)
    return jsonResponse({ error: error.message }, 400)
  }

  if (!data.success) {
    return jsonResponse({ error: data.error }, 403)
  }

  return jsonResponse({
    success: true,
    message: `Role changed from ${data.old_role} to ${data.new_role}`,
    old_role: data.old_role,
    new_role: data.new_role,
  })
}

/**
 * Delete a user's role (effectively removes admin access)
 * Requires: super_admin for super_admin deletion, admin for others
 * BLOCKED: viewer role cannot perform mutations
 */
async function handleDeleteUser(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  // First check if user has any admin access
  const authResult = await requireAdminOrViewer(req)
  if ('response' in authResult) return authResult.response

  const { auth } = authResult

  // SECURITY: Block viewer role from mutations
  if (isViewer(auth.role)) {
    console.warn(`Viewer ${auth.userId} attempted user deletion mutation`)
    return readOnlyResponse()
  }

  const body: DeleteUserRequest = await req.json()

  if (!body.target_user_id) {
    return jsonResponse({ error: 'Missing target_user_id' }, 400)
  }

  // Use the database function for safe role deletion
  const { data, error } = await adminClient.rpc('delete_user_role', {
    p_target_user_id: body.target_user_id,
    p_reason: body.reason || null,
  })

  if (error) {
    console.error('Role deletion error:', error)
    return jsonResponse({ error: error.message }, 400)
  }

  if (!data.success) {
    return jsonResponse({ error: data.error }, 403)
  }

  return jsonResponse({
    success: true,
    message: `Role ${data.deleted_role} removed`,
    deleted_role: data.deleted_role,
  })
}

/**
 * Get the role hierarchy and current user's capabilities
 * Useful for UI to know what actions are available
 * READ-ONLY: Allowed for viewer role
 */
async function handleGetHierarchy(req: Request): Promise<Response> {
  // Use requireAdminOrViewer for read-only operations
  const authResult = await requireAdminOrViewer(req)
  if ('response' in authResult) return authResult.response

  const { auth } = authResult
  const isViewerRole = isViewer(auth.role)

  const hierarchy = {
    roles: [
      { name: 'super_admin', level: 100, label: 'Super Admin (Owner)', description: 'Full control, can manage all roles' },
      { name: 'admin', level: 50, label: 'Admin', description: 'Manage policies and schedules' },
      { name: 'viewer', level: 25, label: 'Viewer (Read-Only)', description: 'View policies, logs, and stats. Cannot create/edit/delete.' },
      { name: 'student', level: 10, label: 'Student', description: 'Subject to policies' },
    ],
    current_user: {
      user_id: auth.userId,
      role: auth.role,
      organization_id: auth.organizationId,
      is_read_only: isViewerRole,
    },
    capabilities: {
      // Viewers have NO mutation capabilities
      can_create_super_admin: !isViewerRole && auth.role === 'super_admin',
      can_create_admin: !isViewerRole && (auth.role === 'super_admin' || auth.role === 'admin'),
      can_create_viewer: !isViewerRole && (auth.role === 'super_admin' || auth.role === 'admin'),
      can_delete_super_admin: !isViewerRole && auth.role === 'super_admin',
      can_delete_admin: !isViewerRole && (auth.role === 'super_admin' || auth.role === 'admin'),
      can_modify_own_role: false, // Never allowed
      can_mutate: !isViewerRole, // Viewers cannot mutate anything
    },
  }

  return jsonResponse(hierarchy)
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
