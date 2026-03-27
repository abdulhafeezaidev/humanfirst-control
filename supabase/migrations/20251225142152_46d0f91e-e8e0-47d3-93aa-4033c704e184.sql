-- Create helper function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- Create helper function to check if user can manage roles
CREATE OR REPLACE FUNCTION public.can_manage_roles(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin(_user_id)
$$;

-- Drop and recreate user_roles policies
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Super admins can manage all roles"
  ON public.user_roles
  FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Admins can view roles"
  ON public.user_roles
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Drop and recreate enforcement_config policies  
DROP POLICY IF EXISTS "Admins can manage enforcement config" ON public.enforcement_config;
DROP POLICY IF EXISTS "Students can view enforcement config" ON public.enforcement_config;

CREATE POLICY "Super admins can manage enforcement config"
  ON public.enforcement_config
  FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Others can view enforcement config"
  ON public.enforcement_config
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'viewer'::app_role) OR has_role(auth.uid(), 'student'::app_role));

-- Drop and recreate exam_policies policies
DROP POLICY IF EXISTS "Admins can manage exam policies" ON public.exam_policies;
DROP POLICY IF EXISTS "Students can view exam policies" ON public.exam_policies;

CREATE POLICY "Admins and super admins can manage exam policies"
  ON public.exam_policies
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

CREATE POLICY "Viewers and students can view exam policies"
  ON public.exam_policies
  FOR SELECT
  USING (has_role(auth.uid(), 'viewer'::app_role) OR has_role(auth.uid(), 'student'::app_role));

-- Drop and recreate AI services policies
DROP POLICY IF EXISTS "Admins can manage AI services" ON public.ai_services;
DROP POLICY IF EXISTS "Students can view AI services" ON public.ai_services;

CREATE POLICY "Admins and super admins can manage AI services"
  ON public.ai_services
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

CREATE POLICY "Viewers and students can view AI services"
  ON public.ai_services
  FOR SELECT
  USING (has_role(auth.uid(), 'viewer'::app_role) OR has_role(auth.uid(), 'student'::app_role));

-- Drop and recreate audit_logs policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;

CREATE POLICY "All admin roles can view audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'viewer'::app_role) OR is_super_admin(auth.uid()));

-- Update tamper_events policies
DROP POLICY IF EXISTS "Admins can manage tamper events" ON public.tamper_events;

CREATE POLICY "Admins and super admins can manage tamper events"
  ON public.tamper_events
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

CREATE POLICY "Viewers can view tamper events"
  ON public.tamper_events
  FOR SELECT
  USING (has_role(auth.uid(), 'viewer'::app_role));