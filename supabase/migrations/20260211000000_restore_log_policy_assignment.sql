-- Restore log_policy_assignment function dropped by 20260128110448_remote_schema.sql
-- This function is used by the admin dashboard when creating, updating, deleting,
-- assigning, and revoking policies.

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

-- Restore check_policy_conflicts function also dropped by the same migration
CREATE OR REPLACE FUNCTION public.check_policy_conflicts(
  p_org_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_exclude_policy_id uuid DEFAULT NULL
)
RETURNS TABLE (
  conflicting_policy_id uuid,
  conflicting_policy_name text,
  conflicting_policy_type policy_type,
  conflicting_priority integer,
  overlap_start timestamptz,
  overlap_end timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ep.id as conflicting_policy_id,
    ep.title as conflicting_policy_name,
    ep.policy_type as conflicting_policy_type,
    ep.priority as conflicting_priority,
    GREATEST(ep.start_time, p_start_time) as overlap_start,
    LEAST(ep.end_time, p_end_time) as overlap_end
  FROM public.exam_policies ep
  WHERE ep.organization_id = p_org_id
    AND ep.is_active = true
    AND ep.status = 'active'
    AND ep.start_time < p_end_time
    AND ep.end_time > p_start_time
    AND (p_exclude_policy_id IS NULL OR ep.id != p_exclude_policy_id);
END;
$$;

-- Restore the active time index for better query performance
CREATE INDEX IF NOT EXISTS idx_exam_policies_active_time
  ON public.exam_policies (organization_id, is_active, start_time, end_time)
  WHERE is_active = true;
