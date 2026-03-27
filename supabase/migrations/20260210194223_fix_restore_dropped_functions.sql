-- Fix migration: Restore functions and triggers dropped by 20260128110448_remote_schema.sql
-- This migration recreates the critical functions needed for auth and admin signup

-- 1. Handle new user trigger (creates profile + student role on signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'User'),
    NEW.email
  );
  
  -- Default role is student
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Restore update triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_exam_policies_updated_at ON public.exam_policies;
CREATE TRIGGER update_exam_policies_updated_at
  BEFORE UPDATE ON public.exam_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Role helper functions
CREATE OR REPLACE FUNCTION public.get_role_level(p_role public.app_role)
RETURNS integer
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN CASE p_role
    WHEN 'super_admin' THEN 4
    WHEN 'admin' THEN 3
    WHEN 'viewer' THEN 2
    WHEN 'student' THEN 1
    ELSE 0
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND public.get_role_level(role) >= public.get_role_level(_role)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_organization(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

-- 4. Create institution with owner (for admin signup)
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

-- 5. Basic RLS policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view org profiles" ON public.profiles;
CREATE POLICY "Admins can view org profiles"
ON public.profiles FOR SELECT
USING (
  organization_id = public.get_user_organization(auth.uid())
  AND public.is_org_admin(auth.uid())
);

-- 6. RLS policies for user_roles (keep existing select own, add admin view)
DROP POLICY IF EXISTS "Admins can view roles" ON public.user_roles;
CREATE POLICY "Admins can view roles"
ON public.user_roles FOR SELECT
USING (public.is_org_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
CREATE POLICY "Super admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.is_super_admin(auth.uid()));

-- 7. RLS policies for organizations
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;
CREATE POLICY "Users can view their own organization"
ON public.organizations FOR SELECT
USING (id = public.get_user_organization(auth.uid()));

DROP POLICY IF EXISTS "Allow organization creation via RPC" ON public.organizations;
CREATE POLICY "Allow organization creation via RPC"
ON public.organizations FOR INSERT
WITH CHECK (true); -- The RPC function is SECURITY DEFINER

DROP POLICY IF EXISTS "Super admins can update their organization" ON public.organizations;
CREATE POLICY "Super admins can update their organization"
ON public.organizations FOR UPDATE
USING (
  id = public.get_user_organization(auth.uid())
  AND public.is_super_admin(auth.uid())
);

-- 8. RLS policies for enforcement_config
DROP POLICY IF EXISTS "Org members can view enforcement config" ON public.enforcement_config;
CREATE POLICY "Org members can view enforcement config"
ON public.enforcement_config FOR SELECT
USING (organization_id = public.get_user_organization(auth.uid()));

DROP POLICY IF EXISTS "Org super admins can manage enforcement config" ON public.enforcement_config;
CREATE POLICY "Org super admins can manage enforcement config"
ON public.enforcement_config FOR ALL
USING (
  organization_id = public.get_user_organization(auth.uid())
  AND public.is_super_admin(auth.uid())
);

-- 9. RLS policies for exam_policies
DROP POLICY IF EXISTS "Org admins can manage exam policies" ON public.exam_policies;
CREATE POLICY "Org admins can manage exam policies"
ON public.exam_policies FOR ALL
USING (
  organization_id = public.get_user_organization(auth.uid())
  AND public.is_org_admin(auth.uid())
);

DROP POLICY IF EXISTS "Org members can view exam policies" ON public.exam_policies;
CREATE POLICY "Org members can view exam policies"
ON public.exam_policies FOR SELECT
USING (organization_id = public.get_user_organization(auth.uid()));

-- 10. RLS policies for audit_logs
DROP POLICY IF EXISTS "Org admin roles can view audit logs" ON public.audit_logs;
CREATE POLICY "Org admin roles can view audit logs"
ON public.audit_logs FOR SELECT
USING (
  organization_id = public.get_user_organization(auth.uid())
  AND public.is_org_admin(auth.uid())
);

-- 11. Audit log helper function
CREATE OR REPLACE FUNCTION public.log_admin_action(
    p_action text,
    p_target text,
    p_target_id text,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_log_id uuid;
    v_org_id uuid;
BEGIN
    SELECT organization_id INTO v_org_id FROM public.profiles WHERE user_id = auth.uid();
    
    INSERT INTO public.audit_logs (action, actor_id, target, target_id, metadata, organization_id)
    VALUES (p_action, auth.uid(), p_target, p_target_id, p_metadata, v_org_id)
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- 12. Prevent last super admin deletion
CREATE OR REPLACE FUNCTION public.prevent_last_super_admin_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id uuid;
    v_super_admin_count integer;
BEGIN
    -- Get the organization of the user being modified
    SELECT organization_id INTO v_org_id FROM public.profiles WHERE user_id = OLD.user_id;
    
    -- Count remaining super admins in the organization
    SELECT COUNT(*) INTO v_super_admin_count
    FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.role = 'super_admin'
      AND p.organization_id = v_org_id
      AND ur.user_id != OLD.user_id;
    
    IF OLD.role = 'super_admin' AND v_super_admin_count = 0 THEN
        RAISE EXCEPTION 'Cannot remove the last super admin from the organization';
    END IF;
    
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS prevent_last_super_admin_deletion_trigger ON public.user_roles;
CREATE TRIGGER prevent_last_super_admin_deletion_trigger
  BEFORE DELETE OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_super_admin_deletion();

-- Done
COMMENT ON FUNCTION public.create_institution_with_owner IS 'Creates organization and makes user super_admin - restored by fix migration';
