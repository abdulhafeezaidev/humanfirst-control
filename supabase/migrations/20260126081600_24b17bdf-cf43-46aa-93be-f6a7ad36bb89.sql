-- Enforcement Metrics Aggregation Function
-- Privacy-preserving: only counts and aggregates, no content inspection

CREATE OR REPLACE FUNCTION public.get_enforcement_metrics(
  p_org_id UUID,
  p_period_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
  v_result JSONB;
  v_policy_metrics JSONB;
  v_enforcement_metrics JSONB;
  v_activity_metrics JSONB;
  v_compliance_score NUMERIC;
  v_resolution_rate NUMERIC;
  v_avg_resolution_hours NUMERIC;
  v_total_events INTEGER;
  v_resolved_events INTEGER;
  v_active_admins INTEGER;
  v_total_actions INTEGER;
BEGIN
  -- Authorization check: caller must be admin/viewer in this org
  IF NOT (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'viewer') OR is_super_admin(auth.uid()))
    AND get_user_organization(auth.uid()) = p_org_id
  ) THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions for org metrics';
  END IF;

  v_period_end := NOW();
  v_period_start := v_period_end - (p_period_days || ' days')::INTERVAL;

  -- Policy Metrics (current state, not time-bounded)
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'active', COUNT(*) FILTER (WHERE is_active = true AND NOW() BETWEEN start_time AND end_time),
    'by_type', jsonb_build_object(
      'exam', COUNT(*) FILTER (WHERE policy_type = 'exam'),
      'focus', COUNT(*) FILTER (WHERE policy_type = 'focus'),
      'custom', COUNT(*) FILTER (WHERE policy_type = 'custom')
    ),
    'by_enforcement_level', jsonb_build_object(
      'strict', COUNT(*) FILTER (WHERE enforcement_level = 'strict'),
      'soft', COUNT(*) FILTER (WHERE enforcement_level = 'soft')
    )
  )
  INTO v_policy_metrics
  FROM exam_policies
  WHERE organization_id = p_org_id;

  -- Enforcement Events (from tamper_events in period)
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE resolved = true)
  INTO v_total_events, v_resolved_events
  FROM tamper_events
  WHERE organization_id = p_org_id
    AND timestamp BETWEEN v_period_start AND v_period_end;

  -- Calculate resolution rate
  v_resolution_rate := CASE 
    WHEN v_total_events > 0 THEN (v_resolved_events::NUMERIC / v_total_events * 100)
    ELSE 100
  END;

  -- Average resolution time (only for resolved events with resolved_at)
  SELECT EXTRACT(EPOCH FROM AVG(resolved_at - timestamp)) / 3600.0
  INTO v_avg_resolution_hours
  FROM tamper_events
  WHERE organization_id = p_org_id
    AND timestamp BETWEEN v_period_start AND v_period_end
    AND resolved = true
    AND resolved_at IS NOT NULL;

  -- Events by type
  SELECT jsonb_build_object(
    'total_events', v_total_events,
    'resolved_events', v_resolved_events,
    'unresolved_events', v_total_events - v_resolved_events,
    'resolution_rate', ROUND(v_resolution_rate, 1),
    'avg_resolution_time_hours', ROUND(v_avg_resolution_hours, 1),
    'events_by_type', COALESCE(
      (SELECT jsonb_object_agg(event_type, cnt)
       FROM (
         SELECT event_type, COUNT(*) as cnt
         FROM tamper_events
         WHERE organization_id = p_org_id
           AND timestamp BETWEEN v_period_start AND v_period_end
         GROUP BY event_type
       ) sub),
      '{}'::JSONB
    )
  )
  INTO v_enforcement_metrics;

  -- Activity Metrics (from audit_logs)
  SELECT COUNT(*), COUNT(DISTINCT actor_id)
  INTO v_total_actions, v_active_admins
  FROM audit_logs
  WHERE organization_id = p_org_id
    AND timestamp BETWEEN v_period_start AND v_period_end;

  SELECT jsonb_build_object(
    'total_actions', v_total_actions,
    'active_admins', v_active_admins,
    'actions_by_type', COALESCE(
      (SELECT jsonb_object_agg(action, cnt)
       FROM (
         SELECT action, COUNT(*) as cnt
         FROM audit_logs
         WHERE organization_id = p_org_id
           AND timestamp BETWEEN v_period_start AND v_period_end
         GROUP BY action
         ORDER BY cnt DESC
         LIMIT 10
       ) sub),
      '{}'::JSONB
    )
  )
  INTO v_activity_metrics;

  -- Compliance Score (weighted aggregate)
  -- Factors: policy coverage (40%), event resolution (40%), admin activity (20%)
  v_compliance_score := (
    -- Policy coverage: having active policies = good
    (CASE WHEN (v_policy_metrics->>'active')::INTEGER > 0 THEN 100 ELSE 50 END) * 0.4 +
    -- Event resolution rate
    v_resolution_rate * 0.4 +
    -- Admin activity: at least 1 action per day on average = good
    (CASE WHEN v_total_actions >= p_period_days THEN 100 
          WHEN v_total_actions > 0 THEN (v_total_actions::NUMERIC / p_period_days * 100)
          ELSE 50 END) * 0.2
  );

  -- Build final result
  v_result := jsonb_build_object(
    'organization_id', p_org_id,
    'computed_at', NOW(),
    'period_start', v_period_start,
    'period_end', v_period_end,
    'policies', v_policy_metrics,
    'enforcement', v_enforcement_metrics,
    'activity', v_activity_metrics,
    'compliance', jsonb_build_object(
      'score', ROUND(v_compliance_score, 0),
      'trend', 'stable', -- Would need historical data for real trend
      'factors', jsonb_build_object(
        'policy_coverage', CASE WHEN (v_policy_metrics->>'active')::INTEGER > 0 THEN 100 ELSE 50 END,
        'event_resolution', ROUND(v_resolution_rate, 0),
        'admin_activity', CASE WHEN v_total_actions >= p_period_days THEN 100 
                               WHEN v_total_actions > 0 THEN ROUND((v_total_actions::NUMERIC / p_period_days * 100), 0)
                               ELSE 50 END
      )
    )
  );

  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users (RLS handled inside function)
GRANT EXECUTE ON FUNCTION public.get_enforcement_metrics(UUID, INTEGER) TO authenticated;