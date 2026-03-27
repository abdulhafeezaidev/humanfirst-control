-- Add 'custom' to policy_type enum
ALTER TYPE public.policy_type ADD VALUE IF NOT EXISTS 'custom';

-- Update get_effective_policy_for_user with enhanced priority logic
-- Priority: Exam (100) > Focus (50) > Custom (10)
-- Deterministic: policy_type → priority → start_time DESC → created_at DESC
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
  -- Get user's organization (institution scoping)
  SELECT organization_id INTO v_org_id FROM public.profiles WHERE user_id = p_user_id;
  
  -- If user has no organization, return empty (no policies can apply)
  IF v_org_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Return ONLY the highest priority active policy
  -- Priority Resolution (deterministic, cannot conflict):
  -- 1. policy_type: exam=0 > focus=1 > custom=2 (lower = higher priority)
  -- 2. explicit priority column (higher = more important)
  -- 3. start_time DESC (newer policies win for same priority)
  -- 4. created_at DESC (tie-breaker for identical start times)
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
    -- Must be active
    ep.is_active = true
    AND ep.status = 'active'
    -- Must be within time window (handles overlapping windows)
    AND now() >= ep.start_time
    AND now() <= ep.end_time
    -- Must be scoped to user's institution
    AND ep.organization_id = v_org_id
    -- Must apply to user (institution-wide OR specifically assigned)
    AND (
      ep.assignment_type = 'institution'
      OR pa.id IS NOT NULL
    )
  ORDER BY 
    -- Primary: Policy type hierarchy (Exam > Focus > Custom)
    CASE ep.policy_type 
      WHEN 'exam' THEN 0 
      WHEN 'focus' THEN 1 
      WHEN 'custom' THEN 2
      ELSE 3 
    END ASC,
    -- Secondary: Explicit priority (higher wins)
    ep.priority DESC,
    -- Tertiary: Newer start time wins (for overlapping windows)
    ep.start_time DESC,
    -- Quaternary: Latest creation wins (absolute tie-breaker)
    ep.created_at DESC
  LIMIT 1; -- CRITICAL: Only ONE policy enforced at a time
END;
$$;

-- Update get_active_exam_policy to use the same logic
-- This is used by students to see their current policy
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
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Get user's organization
  SELECT organization_id INTO v_org_id FROM public.profiles WHERE user_id = v_user_id;
  
  IF v_org_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Return the single highest priority active policy for this user
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

-- Create function to check for policy conflicts (admin helper)
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
    ep.id,
    ep.title,
    ep.policy_type,
    ep.priority,
    GREATEST(ep.start_time, p_start_time) as overlap_start,
    LEAST(ep.end_time, p_end_time) as overlap_end
  FROM public.exam_policies ep
  WHERE 
    ep.organization_id = p_org_id
    AND ep.is_active = true
    AND ep.status = 'active'
    AND (p_exclude_policy_id IS NULL OR ep.id != p_exclude_policy_id)
    -- Check for time overlap
    AND ep.start_time < p_end_time
    AND ep.end_time > p_start_time
  ORDER BY 
    CASE ep.policy_type 
      WHEN 'exam' THEN 0 
      WHEN 'focus' THEN 1 
      WHEN 'custom' THEN 2
      ELSE 3 
    END ASC,
    ep.priority DESC;
END;
$$;