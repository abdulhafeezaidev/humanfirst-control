-- Create policy_type enum
CREATE TYPE public.policy_type AS ENUM ('exam', 'focus');

-- Create enforcement_level enum
CREATE TYPE public.enforcement_level AS ENUM ('strict', 'soft');

-- Create policy_status enum  
CREATE TYPE public.policy_status AS ENUM ('active', 'disabled', 'scheduled');

-- Create policy_assignment_type enum
CREATE TYPE public.policy_assignment_type AS ENUM ('institution', 'individual');

-- Add new columns to exam_policies for full policy engine support
ALTER TABLE public.exam_policies
ADD COLUMN IF NOT EXISTS policy_type policy_type NOT NULL DEFAULT 'exam',
ADD COLUMN IF NOT EXISTS enforcement_level enforcement_level NOT NULL DEFAULT 'strict',
ADD COLUMN IF NOT EXISTS status policy_status NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS assignment_type policy_assignment_type NOT NULL DEFAULT 'institution',
ADD COLUMN IF NOT EXISTS blocked_services text[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 10;

-- Create policy_assignments table for individual student assignments
CREATE TABLE public.policy_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id uuid NOT NULL REFERENCES public.exam_policies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  revoked_at timestamp with time zone,
  notes text,
  UNIQUE(policy_id, user_id)
);

-- Create policy_assignment_logs table for audit trail
CREATE TABLE public.policy_assignment_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id uuid NOT NULL REFERENCES public.exam_policies(id) ON DELETE CASCADE,
  action text NOT NULL, -- 'assigned', 'revoked', 'created', 'updated', 'deleted'
  actor_id uuid NOT NULL,
  target_user_id uuid, -- null for institution-wide
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.policy_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_assignment_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for policy_assignments
CREATE POLICY "Org admins can manage policy assignments"
ON public.policy_assignments
FOR ALL
USING (
  (has_role(auth.uid(), 'admin') OR is_super_admin(auth.uid()))
  AND organization_id = get_user_organization(auth.uid())
);

CREATE POLICY "Students can view own assignments"
ON public.policy_assignments
FOR SELECT
USING (
  auth.uid() = user_id
  AND organization_id = get_user_organization(auth.uid())
);

-- RLS policies for policy_assignment_logs
CREATE POLICY "Org admins can view assignment logs"
ON public.policy_assignment_logs
FOR SELECT
USING (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'viewer') OR is_super_admin(auth.uid()))
  AND organization_id = get_user_organization(auth.uid())
);

CREATE POLICY "Org admins can insert assignment logs"
ON public.policy_assignment_logs
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'admin') OR is_super_admin(auth.uid()))
  AND organization_id = get_user_organization(auth.uid())
);

-- Function to resolve policy conflicts (Exam > Focus)
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
  -- Get user's organization
  SELECT organization_id INTO v_org_id FROM public.profiles WHERE user_id = p_user_id;
  
  -- Return highest priority active policy (Exam=10, Focus=5)
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
  LEFT JOIN public.policy_assignments pa ON pa.policy_id = ep.id AND pa.user_id = p_user_id AND pa.revoked_at IS NULL
  WHERE ep.is_active = true
    AND ep.status = 'active'
    AND now() >= ep.start_time
    AND now() <= ep.end_time
    AND ep.organization_id = v_org_id
    AND (
      ep.assignment_type = 'institution' -- Institution-wide applies to all
      OR pa.id IS NOT NULL -- Or user is specifically assigned
    )
  ORDER BY 
    CASE WHEN ep.policy_type = 'exam' THEN 0 ELSE 1 END, -- Exam > Focus
    ep.priority DESC,
    ep.start_time DESC
  LIMIT 1;
END;
$$;

-- Function to log policy assignment changes
CREATE OR REPLACE FUNCTION public.log_policy_assignment(
  p_policy_id uuid,
  p_action text,
  p_actor_id uuid,
  p_target_user_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
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
  SELECT organization_id INTO v_org_id FROM public.profiles WHERE user_id = p_actor_id;
  
  INSERT INTO public.policy_assignment_logs (policy_id, action, actor_id, target_user_id, organization_id, metadata)
  VALUES (p_policy_id, p_action, p_actor_id, p_target_user_id, v_org_id, p_metadata)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Index for better query performance
CREATE INDEX idx_policy_assignments_policy_id ON public.policy_assignments(policy_id);
CREATE INDEX idx_policy_assignments_user_id ON public.policy_assignments(user_id);
CREATE INDEX idx_policy_assignment_logs_policy_id ON public.policy_assignment_logs(policy_id);
CREATE INDEX idx_exam_policies_active_time ON public.exam_policies(is_active, start_time, end_time);

-- Enable realtime for policy_assignments
ALTER PUBLICATION supabase_realtime ADD TABLE public.policy_assignments;