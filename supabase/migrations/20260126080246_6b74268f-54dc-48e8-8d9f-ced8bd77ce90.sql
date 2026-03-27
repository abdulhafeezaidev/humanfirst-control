-- Fix: Convert SECURITY DEFINER view to secure function
-- Drop the security definer view
DROP VIEW IF EXISTS public.audit_logs_with_role;

-- Create a secure function to access audit logs with role info
CREATE OR REPLACE FUNCTION public.get_audit_logs_with_details(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_action_filter TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  log_id UUID,
  log_actor_id UUID,
  log_action TEXT,
  log_target TEXT,
  log_target_id UUID,
  log_timestamp TIMESTAMPTZ,
  log_organization_id UUID,
  log_metadata JSONB,
  log_actor_role TEXT,
  log_actor_name TEXT,
  log_actor_email TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_org UUID;
BEGIN
  v_user_id := auth.uid();
  
  SELECT p.organization_id INTO v_user_org
  FROM public.profiles p
  WHERE p.user_id = v_user_id;
  
  IF NOT (is_super_admin(v_user_id) OR has_role(v_user_id, 'admin') OR has_role(v_user_id, 'viewer')) THEN
    RAISE EXCEPTION 'Access denied: Only administrators can view audit logs';
  END IF;
  
  RETURN QUERY
  SELECT 
    al.id,
    al.actor_id,
    al.action,
    al.target,
    al.target_id,
    al.timestamp,
    al.organization_id,
    al.metadata,
    (al.metadata->>'actor_role')::TEXT,
    p.full_name,
    p.email
  FROM public.audit_logs al
  LEFT JOIN public.profiles p ON p.user_id = al.actor_id
  WHERE al.organization_id = v_user_org
    AND (p_action_filter IS NULL OR al.action ILIKE '%' || p_action_filter || '%')
    AND (p_start_date IS NULL OR al.timestamp >= p_start_date)
    AND (p_end_date IS NULL OR al.timestamp <= p_end_date)
  ORDER BY al.timestamp DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Create function to get audit log statistics
CREATE OR REPLACE FUNCTION public.get_audit_log_stats()
RETURNS TABLE (
  total_logs BIGINT,
  logs_today BIGINT,
  logs_this_week BIGINT,
  top_actions JSONB
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_org UUID;
BEGIN
  v_user_id := auth.uid();
  
  SELECT p.organization_id INTO v_user_org
  FROM public.profiles p
  WHERE p.user_id = v_user_id;
  
  IF NOT (is_super_admin(v_user_id) OR has_role(v_user_id, 'admin') OR has_role(v_user_id, 'viewer')) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM audit_logs WHERE organization_id = v_user_org)::BIGINT,
    (SELECT COUNT(*) FROM audit_logs WHERE organization_id = v_user_org AND timestamp >= CURRENT_DATE)::BIGINT,
    (SELECT COUNT(*) FROM audit_logs WHERE organization_id = v_user_org AND timestamp >= CURRENT_DATE - INTERVAL '7 days')::BIGINT,
    (SELECT jsonb_agg(action_counts) FROM (
      SELECT jsonb_build_object('action', action, 'count', COUNT(*)) as action_counts
      FROM audit_logs 
      WHERE organization_id = v_user_org
      GROUP BY action
      ORDER BY COUNT(*) DESC
      LIMIT 5
    ) t)::JSONB;
END;
$$;