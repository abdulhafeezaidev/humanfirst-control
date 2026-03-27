-- =====================================================
-- ADMIN HIERARCHY ENFORCEMENT
-- Prevents role escalation and enforces strict hierarchy:
-- 1. Only super_admin (OWNER) can create other super_admins
-- 2. Admins cannot delete super_admins
-- 3. Users cannot promote themselves
-- 4. At least one super_admin must exist per organization
-- =====================================================

-- Function to get role hierarchy level (higher = more privileged)
CREATE OR REPLACE FUNCTION public.get_role_level(p_role app_role)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_role
    WHEN 'super_admin' THEN 100
    WHEN 'admin' THEN 50
    WHEN 'viewer' THEN 25
    WHEN 'student' THEN 10
    ELSE 0
  END;
$$;

-- Function to check if user can manage target role
-- Returns true if actor has sufficient privileges
CREATE OR REPLACE FUNCTION public.can_manage_target_role(
  p_actor_id uuid,
  p_target_role app_role
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role app_role;
  v_actor_level integer;
  v_target_level integer;
BEGIN
  -- Get actor's role
  SELECT role INTO v_actor_role
  FROM public.user_roles
  WHERE user_id = p_actor_id;
  
  IF v_actor_role IS NULL THEN
    RETURN false;
  END IF;
  
  v_actor_level := get_role_level(v_actor_role);
  v_target_level := get_role_level(p_target_role);
  
  -- Only super_admin can create/modify super_admin roles
  IF p_target_role = 'super_admin' THEN
    RETURN v_actor_role = 'super_admin';
  END IF;
  
  -- Actor must have higher or equal privilege level
  RETURN v_actor_level >= v_target_level;
END;
$$;

-- Function to count super_admins in an organization
CREATE OR REPLACE FUNCTION public.count_org_super_admins(p_org_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.user_roles ur
  JOIN public.profiles p ON ur.user_id = p.user_id
  WHERE ur.role = 'super_admin'
    AND p.organization_id = p_org_id;
$$;

-- Trigger function to enforce role hierarchy on INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.enforce_role_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_actor_role app_role;
  v_old_role app_role;
  v_target_org_id uuid;
BEGIN
  v_actor_id := auth.uid();
  
  -- Get the actor's current role
  SELECT role INTO v_actor_role
  FROM public.user_roles
  WHERE user_id = v_actor_id;
  
  -- Allow system operations (no auth context) - for triggers/RPC with SECURITY DEFINER
  IF v_actor_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- RULE 1: Users cannot modify their own role (self-promotion prevention)
  IF NEW.user_id = v_actor_id THEN
    RAISE EXCEPTION 'Cannot modify your own role. Contact another super admin.';
  END IF;
  
  -- RULE 2: Only super_admin can assign super_admin role
  IF NEW.role = 'super_admin' AND v_actor_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super admins can assign the super admin role';
  END IF;
  
  -- RULE 3: For updates, check if actor can modify the OLD role
  IF TG_OP = 'UPDATE' THEN
    v_old_role := OLD.role;
    
    -- Cannot demote a super_admin unless you're a super_admin
    IF v_old_role = 'super_admin' AND v_actor_role != 'super_admin' THEN
      RAISE EXCEPTION 'Only super admins can modify super admin roles';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function to prevent last super_admin deletion
CREATE OR REPLACE FUNCTION public.prevent_last_super_admin_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_actor_role app_role;
  v_target_org_id uuid;
  v_super_admin_count integer;
BEGIN
  v_actor_id := auth.uid();
  
  -- Get actor's role
  SELECT role INTO v_actor_role
  FROM public.user_roles
  WHERE user_id = v_actor_id;
  
  -- RULE 1: Non-super_admins cannot delete super_admin roles
  IF OLD.role = 'super_admin' AND v_actor_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super admins can remove super admin roles';
  END IF;
  
  -- RULE 2: Cannot delete yourself (handled by RLS, but double-check)
  IF OLD.user_id = v_actor_id THEN
    RAISE EXCEPTION 'Cannot delete your own role';
  END IF;
  
  -- RULE 3: Prevent deletion of last super_admin in organization
  IF OLD.role = 'super_admin' THEN
    SELECT organization_id INTO v_target_org_id
    FROM public.profiles
    WHERE user_id = OLD.user_id;
    
    IF v_target_org_id IS NOT NULL THEN
      v_super_admin_count := count_org_super_admins(v_target_org_id);
      
      IF v_super_admin_count <= 1 THEN
        RAISE EXCEPTION 'Cannot delete the last super admin of an organization';
      END IF;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS enforce_role_hierarchy_trigger ON public.user_roles;
DROP TRIGGER IF EXISTS prevent_last_super_admin_deletion_trigger ON public.user_roles;

-- Create triggers
CREATE TRIGGER enforce_role_hierarchy_trigger
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_role_hierarchy();

CREATE TRIGGER prevent_last_super_admin_deletion_trigger
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_super_admin_deletion();

-- Update the use_admin_invitation function to validate role hierarchy
CREATE OR REPLACE FUNCTION public.use_admin_invitation(p_token uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invitation RECORD;
    v_inviter_role app_role;
    v_result jsonb;
BEGIN
    -- Get and lock the invitation
    SELECT * INTO v_invitation
    FROM public.admin_invitations
    WHERE token = p_token
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invitation not found');
    END IF;
    
    IF v_invitation.used_at IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invitation already used');
    END IF;
    
    IF v_invitation.expires_at < now() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invitation expired');
    END IF;
    
    -- SECURITY: Validate that inviter still has permission to invite this role
    SELECT role INTO v_inviter_role
    FROM public.user_roles
    WHERE user_id = v_invitation.invited_by;
    
    IF v_invitation.role = 'super_admin' AND v_inviter_role != 'super_admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Inviter no longer has permission to grant super admin role');
    END IF;
    
    -- Check if user already has a role
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id) THEN
        -- Update existing role
        UPDATE public.user_roles
        SET role = v_invitation.role
        WHERE user_id = p_user_id;
    ELSE
        -- Insert new role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (p_user_id, v_invitation.role);
    END IF;
    
    -- Update user's organization
    UPDATE public.profiles
    SET organization_id = v_invitation.organization_id
    WHERE user_id = p_user_id;
    
    -- If no profile exists, this is handled by auth triggers
    
    -- Mark invitation as used
    UPDATE public.admin_invitations
    SET used_at = now()
    WHERE id = v_invitation.id;
    
    -- Create audit log
    INSERT INTO public.audit_logs (action, actor_id, target, target_id, metadata, organization_id)
    VALUES (
        'admin_invitation_used',
        p_user_id,
        'admin_invitations',
        v_invitation.id,
        jsonb_build_object(
            'role', v_invitation.role, 
            'email', v_invitation.email,
            'inviter_role', v_inviter_role
        ),
        v_invitation.organization_id
    );
    
    RETURN jsonb_build_object(
        'success', true, 
        'role', v_invitation.role,
        'organization_id', v_invitation.organization_id
    );
END;
$$;

-- Function to safely change a user's role with full validation
CREATE OR REPLACE FUNCTION public.change_user_role(
  p_target_user_id uuid,
  p_new_role app_role,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_actor_role app_role;
  v_old_role app_role;
  v_target_org_id uuid;
  v_actor_org_id uuid;
BEGIN
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get actor's role and org
  SELECT ur.role, p.organization_id 
  INTO v_actor_role, v_actor_org_id
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON ur.user_id = p.user_id
  WHERE ur.user_id = v_actor_id;
  
  -- Get target's current role and org
  SELECT ur.role, p.organization_id 
  INTO v_old_role, v_target_org_id
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON ur.user_id = p.user_id
  WHERE ur.user_id = p_target_user_id;
  
  IF v_old_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target user not found');
  END IF;
  
  -- Must be in same organization
  IF v_actor_org_id IS DISTINCT FROM v_target_org_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot modify users in other organizations');
  END IF;
  
  -- Cannot modify own role
  IF v_actor_id = p_target_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot modify your own role');
  END IF;
  
  -- Only super_admin can modify super_admin or assign super_admin
  IF (v_old_role = 'super_admin' OR p_new_role = 'super_admin') AND v_actor_role != 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only super admins can manage super admin roles');
  END IF;
  
  -- Prevent removing last super_admin
  IF v_old_role = 'super_admin' AND p_new_role != 'super_admin' THEN
    IF count_org_super_admins(v_target_org_id) <= 1 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot demote the last super admin');
    END IF;
  END IF;
  
  -- Perform the update
  UPDATE public.user_roles
  SET role = p_new_role
  WHERE user_id = p_target_user_id;
  
  -- Create audit log
  INSERT INTO public.audit_logs (action, actor_id, target, target_id, metadata, organization_id)
  VALUES (
    'role_changed',
    v_actor_id,
    'user_roles',
    p_target_user_id,
    jsonb_build_object(
      'old_role', v_old_role,
      'new_role', p_new_role,
      'reason', p_reason
    ),
    v_actor_org_id
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'old_role', v_old_role,
    'new_role', p_new_role
  );
END;
$$;

-- Function to safely delete a user's role with full validation
CREATE OR REPLACE FUNCTION public.delete_user_role(
  p_target_user_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_actor_role app_role;
  v_target_role app_role;
  v_target_org_id uuid;
  v_actor_org_id uuid;
BEGIN
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get actor's role and org
  SELECT ur.role, p.organization_id 
  INTO v_actor_role, v_actor_org_id
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON ur.user_id = p.user_id
  WHERE ur.user_id = v_actor_id;
  
  -- Get target's current role and org
  SELECT ur.role, p.organization_id 
  INTO v_target_role, v_target_org_id
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON ur.user_id = p.user_id
  WHERE ur.user_id = p_target_user_id;
  
  IF v_target_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target user not found');
  END IF;
  
  -- Must be in same organization
  IF v_actor_org_id IS DISTINCT FROM v_target_org_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot modify users in other organizations');
  END IF;
  
  -- Cannot delete own role
  IF v_actor_id = p_target_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot delete your own role');
  END IF;
  
  -- Only super_admin can delete super_admin
  IF v_target_role = 'super_admin' AND v_actor_role != 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only super admins can remove super admin roles');
  END IF;
  
  -- Prevent removing last super_admin
  IF v_target_role = 'super_admin' THEN
    IF count_org_super_admins(v_target_org_id) <= 1 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot delete the last super admin');
    END IF;
  END IF;
  
  -- Perform the delete
  DELETE FROM public.user_roles
  WHERE user_id = p_target_user_id;
  
  -- Create audit log
  INSERT INTO public.audit_logs (action, actor_id, target, target_id, metadata, organization_id)
  VALUES (
    'role_deleted',
    v_actor_id,
    'user_roles',
    p_target_user_id,
    jsonb_build_object(
      'deleted_role', v_target_role,
      'reason', p_reason
    ),
    v_actor_org_id
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_role', v_target_role
  );
END;
$$;