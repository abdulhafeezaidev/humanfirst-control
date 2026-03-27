-- Create admin_invitations table for invitation-based admin signup
CREATE TABLE IF NOT EXISTS public.admin_invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    role app_role NOT NULL DEFAULT 'admin'::app_role,
    token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    invited_by uuid NOT NULL,
    expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
    used_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT valid_admin_role CHECK (role IN ('admin', 'viewer', 'super_admin'))
);

-- Enable RLS
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_invitations
CREATE POLICY "Super admins can manage all invitations"
ON public.admin_invitations
FOR ALL
USING (is_super_admin(auth.uid()) AND organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Admins can create admin/viewer invitations"
ON public.admin_invitations
FOR INSERT
WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) 
    AND role IN ('admin', 'viewer')
    AND organization_id = get_user_organization(auth.uid())
);

CREATE POLICY "Admins can view org invitations"
ON public.admin_invitations
FOR SELECT
USING (
    (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()))
    AND organization_id = get_user_organization(auth.uid())
);

-- Public function to check invitation by token (for signup flow)
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

-- Function to mark invitation as used and assign role
CREATE OR REPLACE FUNCTION public.use_admin_invitation(p_token uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invitation RECORD;
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
    
    -- Update user's role
    UPDATE public.user_roles
    SET role = v_invitation.role
    WHERE user_id = p_user_id;
    
    -- Update user's organization
    UPDATE public.profiles
    SET organization_id = v_invitation.organization_id
    WHERE user_id = p_user_id;
    
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
        jsonb_build_object('role', v_invitation.role, 'email', v_invitation.email),
        v_invitation.organization_id
    );
    
    RETURN jsonb_build_object(
        'success', true, 
        'role', v_invitation.role,
        'organization_id', v_invitation.organization_id
    );
END;
$$;

-- Function to handle first admin (owner) signup
-- This creates the organization and makes the user super_admin
CREATE OR REPLACE FUNCTION public.create_institution_with_owner(
    p_user_id uuid,
    p_institution_name text,
    p_institution_slug text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id uuid;
BEGIN
    -- Check if slug already exists
    IF EXISTS (SELECT 1 FROM public.organizations WHERE slug = p_institution_slug) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Institution slug already exists');
    END IF;
    
    -- Create organization
    INSERT INTO public.organizations (name, slug, plan_type)
    VALUES (p_institution_name, p_institution_slug, 'pilot')
    RETURNING id INTO v_org_id;
    
    -- Update user to super_admin role
    UPDATE public.user_roles
    SET role = 'super_admin'
    WHERE user_id = p_user_id;
    
    -- Link user to organization
    UPDATE public.profiles
    SET organization_id = v_org_id
    WHERE user_id = p_user_id;
    
    -- Create default enforcement config for the org
    INSERT INTO public.enforcement_config (organization_id, status, pilot_mode)
    VALUES (v_org_id, 'not_connected', true);
    
    -- Create audit log
    INSERT INTO public.audit_logs (action, actor_id, target, target_id, metadata, organization_id)
    VALUES (
        'institution_created',
        p_user_id,
        'organizations',
        v_org_id,
        jsonb_build_object('name', p_institution_name, 'slug', p_institution_slug),
        v_org_id
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'organization_id', v_org_id,
        'role', 'super_admin'
    );
END;
$$;