-- Create plan_type enum
CREATE TYPE public.plan_type AS ENUM ('pilot', 'standard', 'institution');

-- Create organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan_type public.plan_type NOT NULL DEFAULT 'pilot',
  max_devices INTEGER NOT NULL DEFAULT 10,
  max_admins INTEGER NOT NULL DEFAULT 2,
  max_students INTEGER NOT NULL DEFAULT 50,
  features_enabled TEXT[] NOT NULL DEFAULT ARRAY['basic_policies', 'tamper_detection']::TEXT[],
  pilot_expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add organization_id to profiles
ALTER TABLE public.profiles 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Add organization_id to exam_policies
ALTER TABLE public.exam_policies 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Add organization_id to tamper_events
ALTER TABLE public.tamper_events 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Add organization_id to enforcement_config
ALTER TABLE public.enforcement_config 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Add organization_id to audit_logs
ALTER TABLE public.audit_logs 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX idx_profiles_organization ON public.profiles(organization_id);
CREATE INDEX idx_exam_policies_organization ON public.exam_policies(organization_id);
CREATE INDEX idx_tamper_events_organization ON public.tamper_events(organization_id);
CREATE INDEX idx_audit_logs_organization ON public.audit_logs(organization_id);

-- Add trigger for updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Create function to check if user belongs to organization
CREATE OR REPLACE FUNCTION public.belongs_to_organization(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND organization_id = _org_id
  )
$$;

-- Create function to check if user is org admin (admin or super_admin in their org)
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (public.has_role(_user_id, 'admin') OR public.is_super_admin(_user_id))
$$;

-- RLS Policies for organizations table
CREATE POLICY "Users can view their own organization"
ON public.organizations
FOR SELECT
USING (
  id = public.get_user_organization(auth.uid())
);

CREATE POLICY "Super admins can manage their organization"
ON public.organizations
FOR ALL
USING (
  id = public.get_user_organization(auth.uid()) 
  AND public.is_super_admin(auth.uid())
);

-- Update profiles RLS to include organization scoping
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view org profiles"
ON public.profiles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') 
  AND organization_id = public.get_user_organization(auth.uid())
);

CREATE POLICY "Super admins can view all org profiles"
ON public.profiles
FOR SELECT
USING (
  public.is_super_admin(auth.uid())
  AND organization_id = public.get_user_organization(auth.uid())
);

-- Update exam_policies RLS for organization scoping
DROP POLICY IF EXISTS "Admins and super admins can manage exam policies" ON public.exam_policies;
DROP POLICY IF EXISTS "Viewers and students can view exam policies" ON public.exam_policies;

CREATE POLICY "Org admins can manage exam policies"
ON public.exam_policies
FOR ALL
USING (
  (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  AND organization_id = public.get_user_organization(auth.uid())
);

CREATE POLICY "Org members can view exam policies"
ON public.exam_policies
FOR SELECT
USING (
  (public.has_role(auth.uid(), 'viewer') OR public.has_role(auth.uid(), 'student'))
  AND organization_id = public.get_user_organization(auth.uid())
);

-- Update tamper_events RLS for organization scoping
DROP POLICY IF EXISTS "Admins and super admins can manage tamper events" ON public.tamper_events;
DROP POLICY IF EXISTS "Students can insert own tamper events" ON public.tamper_events;
DROP POLICY IF EXISTS "Students can view own tamper events" ON public.tamper_events;
DROP POLICY IF EXISTS "Viewers can view tamper events" ON public.tamper_events;

CREATE POLICY "Org admins can manage tamper events"
ON public.tamper_events
FOR ALL
USING (
  (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  AND organization_id = public.get_user_organization(auth.uid())
);

CREATE POLICY "Students can insert own tamper events"
ON public.tamper_events
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND organization_id = public.get_user_organization(auth.uid())
);

CREATE POLICY "Students can view own tamper events"
ON public.tamper_events
FOR SELECT
USING (
  auth.uid() = user_id
  AND organization_id = public.get_user_organization(auth.uid())
);

CREATE POLICY "Viewers can view org tamper events"
ON public.tamper_events
FOR SELECT
USING (
  public.has_role(auth.uid(), 'viewer')
  AND organization_id = public.get_user_organization(auth.uid())
);

-- Update audit_logs RLS for organization scoping
DROP POLICY IF EXISTS "All admin roles can view audit logs" ON public.audit_logs;

CREATE POLICY "Org admin roles can view audit logs"
ON public.audit_logs
FOR SELECT
USING (
  (public.has_role(auth.uid(), 'admin') 
   OR public.has_role(auth.uid(), 'viewer') 
   OR public.is_super_admin(auth.uid()))
  AND organization_id = public.get_user_organization(auth.uid())
);

-- Update enforcement_config RLS for organization scoping
DROP POLICY IF EXISTS "Others can view enforcement config" ON public.enforcement_config;
DROP POLICY IF EXISTS "Super admins can manage enforcement config" ON public.enforcement_config;

CREATE POLICY "Org members can view enforcement config"
ON public.enforcement_config
FOR SELECT
USING (
  (public.has_role(auth.uid(), 'admin') 
   OR public.has_role(auth.uid(), 'viewer') 
   OR public.has_role(auth.uid(), 'student'))
  AND organization_id = public.get_user_organization(auth.uid())
);

CREATE POLICY "Org super admins can manage enforcement config"
ON public.enforcement_config
FOR ALL
USING (
  public.is_super_admin(auth.uid())
  AND organization_id = public.get_user_organization(auth.uid())
);

-- Update ai_services RLS (these are global, not org-scoped)
-- Keep existing policies as AI services are shared across all orgs