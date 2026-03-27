-- Fix: create_institution_with_owner now upserts user_roles instead of UPDATE
-- This ensures users created before handle_new_user trigger was restored get their role

-- 1. Fix existing users who signed up but don't have user_roles entries
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'student'::public.app_role
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.user_id IS NULL;

-- 2. Fix existing users who signed up but don't have profiles
INSERT INTO public.profiles (user_id, full_name, email)
SELECT u.id, COALESCE(u.raw_user_meta_data ->> 'full_name', 'User'), u.email
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

-- 3. Replace create_institution_with_owner with upsert logic
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
    
    -- Upsert user role to super_admin (handles users who don't have a role yet)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, 'super_admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';
    
    -- Link user to organization
    UPDATE public.profiles
    SET organization_id = v_org_id
    WHERE user_id = p_user_id;
    
    -- If profile doesn't exist, create it
    IF NOT FOUND THEN
        INSERT INTO public.profiles (user_id, organization_id, full_name, email)
        SELECT p_user_id, v_org_id, 
               COALESCE(u.raw_user_meta_data ->> 'full_name', 'Admin'),
               u.email
        FROM auth.users u WHERE u.id = p_user_id;
    END IF;
    
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

COMMENT ON FUNCTION public.create_institution_with_owner IS 'Creates organization and makes user super_admin - uses upsert for robustness';
