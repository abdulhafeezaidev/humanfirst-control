-- Restore all dropped functions from migration 20260128110448_remote_schema.sql

-- 1. get_effective_policy_for_user - Returns the single highest priority active policy
CREATE OR REPLACE FUNCTION public.get_effective_policy_for_user(p_user_id uuid)
RETURNS TABLE (
  policy_id uuid,
  policy_name text,
  policy_type policy_type,
  enforcement_level enforcement_level,
  blocked_services text[],
  blocked_categories text[],
  start_time timestamptz,
  end_time timestamptz,
  priority integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT organization_id INTO v_org_id FROM public.profiles WHERE user_id = p_user_id;
  
  IF v_org_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    ep.id as policy_id,
    ep.title as policy_name,
    ep.policy_type,
    ep.enforcement_level,
    ep.blocked_services,
    ep.blocked_categories,
    ep.start_time,
    ep.end_time,
    ep.priority
  FROM public.exam_policies ep
  LEFT JOIN public.policy_assignments pa 
    ON pa.policy_id = ep.id 
    AND pa.user_id = p_user_id 
    AND pa.revoked_at IS NULL
  WHERE 
    ep.is_active = true
    AND ep.status = 'active'
    AND now() >= ep.start_time
    AND now() <= ep.end_time
    AND ep.organization_id = v_org_id
    AND (
      ep.assignment_type = 'institution'
      OR pa.id IS NOT NULL
    )
  ORDER BY 
    CASE ep.policy_type 
      WHEN 'exam' THEN 0 
      WHEN 'focus' THEN 1 
      WHEN 'custom' THEN 2
      ELSE 3 
    END ASC,
    ep.priority DESC,
    ep.start_time DESC,
    ep.created_at DESC
  LIMIT 1;
END;
$$;

-- 2. get_active_exam_policy - Used by students to see their current policy
CREATE OR REPLACE FUNCTION public.get_active_exam_policy()
RETURNS SETOF public.exam_policies
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;
  
  SELECT organization_id INTO v_org_id FROM public.profiles WHERE user_id = v_user_id;
  
  IF v_org_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT ep.*
  FROM public.exam_policies ep
  LEFT JOIN public.policy_assignments pa 
    ON pa.policy_id = ep.id 
    AND pa.user_id = v_user_id 
    AND pa.revoked_at IS NULL
  WHERE 
    ep.is_active = true
    AND ep.status = 'active'
    AND now() >= ep.start_time
    AND now() <= ep.end_time
    AND ep.organization_id = v_org_id
    AND (
      ep.assignment_type = 'institution'
      OR pa.id IS NOT NULL
    )
  ORDER BY 
    CASE ep.policy_type 
      WHEN 'exam' THEN 0 
      WHEN 'focus' THEN 1 
      WHEN 'custom' THEN 2
      ELSE 3 
    END ASC,
    ep.priority DESC,
    ep.start_time DESC,
    ep.created_at DESC
  LIMIT 1;
END;
$$;

-- 3. is_exam_mode_active - Check if any exam is currently active
CREATE OR REPLACE FUNCTION public.is_exam_mode_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.exam_policies
    WHERE is_active = true
      AND now() >= start_time
      AND now() <= end_time
  )
$$;

-- 4. get_invitation_by_token - Check invitation for signup flow
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token uuid)
RETURNS TABLE (
    id uuid,
    email text,
    role app_role,
    organization_id uuid,
    organization_name text,
    expires_at timestamp with time zone,
    is_valid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ai.id,
        ai.email,
        ai.role,
        ai.organization_id,
        o.name as organization_name,
        ai.expires_at,
        (ai.used_at IS NULL AND ai.expires_at > now()) as is_valid
    FROM public.admin_invitations ai
    LEFT JOIN public.organizations o ON o.id = ai.organization_id
    WHERE ai.token = p_token;
END;
$$;

-- 5. use_admin_invitation - Mark invitation as used and assign role
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
    
    SELECT role INTO v_inviter_role
    FROM public.user_roles
    WHERE user_id = v_invitation.invited_by;
    
    IF v_invitation.role = 'super_admin' AND v_inviter_role != 'super_admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Inviter no longer has permission to grant super admin role');
    END IF;
    
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id) THEN
        UPDATE public.user_roles
        SET role = v_invitation.role
        WHERE user_id = p_user_id;
    ELSE
        INSERT INTO public.user_roles (user_id, role)
        VALUES (p_user_id, v_invitation.role);
    END IF;
    
    UPDATE public.profiles
    SET organization_id = v_invitation.organization_id
    WHERE user_id = p_user_id;
    
    UPDATE public.admin_invitations
    SET used_at = now()
    WHERE id = v_invitation.id;
    
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

-- 6. get_public_policy_summary - Public policy sharing (no auth)
CREATE OR REPLACE FUNCTION public.get_public_policy_summary(p_share_token uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.enforcement_config 
    WHERE share_token = p_share_token AND share_enabled = true
  ) THEN
    RETURN json_build_object('error', 'Invalid or disabled share link');
  END IF;

  SELECT json_build_object(
    'enforcement_status', (SELECT status FROM public.enforcement_config LIMIT 1),
    'active_policy', (
      SELECT json_build_object(
        'title', ep.title,
        'description', ep.description,
        'start_time', ep.start_time,
        'end_time', ep.end_time,
        'blocked_categories', ep.blocked_categories
      )
      FROM public.exam_policies ep
      WHERE ep.is_active = true 
        AND now() >= ep.start_time 
        AND now() <= ep.end_time
      LIMIT 1
    ),
    'upcoming_policies', (
      SELECT json_agg(json_build_object(
        'title', ep.title,
        'start_time', ep.start_time,
        'end_time', ep.end_time,
        'blocked_categories', ep.blocked_categories
      ))
      FROM public.exam_policies ep
      WHERE ep.is_active = true 
        AND ep.start_time > now()
    ),
    'blocked_services', (
      SELECT json_agg(json_build_object(
        'name', ai.name,
        'category', ai.category,
        'domains', ai.domains
      ))
      FROM public.ai_services ai
      WHERE ai.is_blocked_during_exam = true
    ),
    'generated_at', now()
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute permission for public access
GRANT EXECUTE ON FUNCTION public.get_public_policy_summary(uuid) TO anon;

-- 7. Restored function comment
COMMENT ON FUNCTION public.get_active_exam_policy IS 'Returns active policy for current user - restored after 20260128 drop';
