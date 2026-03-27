-- ============================================================
-- Metrics Aggregation Tables
-- Privacy-preserving, institution-scoped, no personal identifiers
-- ============================================================

-- Daily metrics aggregation table
CREATE TABLE public.metrics_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  
  -- Policy metrics (counts only)
  policies_total INTEGER NOT NULL DEFAULT 0,
  policies_active INTEGER NOT NULL DEFAULT 0,
  policies_by_type JSONB NOT NULL DEFAULT '{"exam": 0, "focus": 0, "custom": 0}'::jsonb,
  policies_by_enforcement JSONB NOT NULL DEFAULT '{"strict": 0, "soft": 0}'::jsonb,
  
  -- Enforcement event metrics (aggregate counts, no identifiers)
  events_total INTEGER NOT NULL DEFAULT 0,
  events_resolved INTEGER NOT NULL DEFAULT 0,
  events_unresolved INTEGER NOT NULL DEFAULT 0,
  events_by_type JSONB NOT NULL DEFAULT '{}'::jsonb,
  avg_resolution_minutes NUMERIC(10,2),
  
  -- Session metrics (durations only, no user tracking)
  sessions_total INTEGER NOT NULL DEFAULT 0,
  sessions_avg_duration_minutes NUMERIC(10,2),
  sessions_total_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Admin activity metrics (action counts only)
  admin_actions_total INTEGER NOT NULL DEFAULT 0,
  admin_actions_by_type JSONB NOT NULL DEFAULT '{}'::jsonb,
  active_admins_count INTEGER NOT NULL DEFAULT 0,
  
  -- Computed compliance score
  compliance_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  compliance_factors JSONB NOT NULL DEFAULT '{"policy_coverage": 0, "event_resolution": 0, "admin_activity": 0}'::jsonb,
  
  -- Uptime tracking
  uptime_percentage NUMERIC(5,2) NOT NULL DEFAULT 100,
  downtime_minutes INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint: one record per org per day
  CONSTRAINT metrics_daily_org_date_unique UNIQUE (organization_id, metric_date)
);

-- Monthly rollup table
CREATE TABLE public.metrics_monthly (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  metric_year INTEGER NOT NULL,
  metric_month INTEGER NOT NULL CHECK (metric_month >= 1 AND metric_month <= 12),
  
  -- Aggregated policy metrics
  avg_policies_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  avg_policies_active NUMERIC(10,2) NOT NULL DEFAULT 0,
  policies_created INTEGER NOT NULL DEFAULT 0,
  policies_deleted INTEGER NOT NULL DEFAULT 0,
  
  -- Aggregated event metrics
  total_events INTEGER NOT NULL DEFAULT 0,
  total_resolved INTEGER NOT NULL DEFAULT 0,
  resolution_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  avg_resolution_minutes NUMERIC(10,2),
  events_by_type JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Aggregated session metrics
  total_sessions INTEGER NOT NULL DEFAULT 0,
  total_session_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  avg_session_duration_minutes NUMERIC(10,2),
  
  -- Aggregated admin metrics
  total_admin_actions INTEGER NOT NULL DEFAULT 0,
  unique_active_admins INTEGER NOT NULL DEFAULT 0,
  top_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Compliance trends
  avg_compliance_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  min_compliance_score NUMERIC(5,2),
  max_compliance_score NUMERIC(5,2),
  compliance_trend TEXT CHECK (compliance_trend IN ('improving', 'stable', 'declining')),
  
  -- Uptime summary
  avg_uptime_percentage NUMERIC(5,2) NOT NULL DEFAULT 100,
  total_downtime_minutes INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  days_with_data INTEGER NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint: one record per org per month
  CONSTRAINT metrics_monthly_org_month_unique UNIQUE (organization_id, metric_year, metric_month)
);

-- Indexes for efficient queries
CREATE INDEX idx_metrics_daily_org_date ON public.metrics_daily(organization_id, metric_date DESC);
CREATE INDEX idx_metrics_daily_date ON public.metrics_daily(metric_date DESC);
CREATE INDEX idx_metrics_monthly_org_period ON public.metrics_monthly(organization_id, metric_year DESC, metric_month DESC);

-- Enable RLS
ALTER TABLE public.metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics_monthly ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Read-only for admins/viewers within their org
CREATE POLICY "Org admins can view daily metrics"
  ON public.metrics_daily FOR SELECT
  USING (
    (has_role(auth.uid(), 'admin'::app_role) OR 
     has_role(auth.uid(), 'viewer'::app_role) OR 
     is_super_admin(auth.uid()))
    AND organization_id = get_user_organization(auth.uid())
  );

CREATE POLICY "Org admins can view monthly metrics"
  ON public.metrics_monthly FOR SELECT
  USING (
    (has_role(auth.uid(), 'admin'::app_role) OR 
     has_role(auth.uid(), 'viewer'::app_role) OR 
     is_super_admin(auth.uid()))
    AND organization_id = get_user_organization(auth.uid())
  );

-- ============================================================
-- Daily Aggregation Function
-- Called by scheduled job to compute daily metrics
-- ============================================================
CREATE OR REPLACE FUNCTION public.aggregate_daily_metrics(
  p_org_id UUID,
  p_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metric_id UUID;
  v_policies_total INTEGER;
  v_policies_active INTEGER;
  v_policies_by_type JSONB;
  v_policies_by_enforcement JSONB;
  v_events_total INTEGER;
  v_events_resolved INTEGER;
  v_events_by_type JSONB;
  v_avg_resolution NUMERIC;
  v_admin_actions INTEGER;
  v_admin_by_type JSONB;
  v_active_admins INTEGER;
  v_compliance_score NUMERIC;
BEGIN
  -- Policy counts (snapshot at end of day)
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE is_active = true AND status = 'active'),
    jsonb_build_object(
      'exam', COUNT(*) FILTER (WHERE policy_type = 'exam'),
      'focus', COUNT(*) FILTER (WHERE policy_type = 'focus'),
      'custom', COUNT(*) FILTER (WHERE policy_type = 'custom')
    ),
    jsonb_build_object(
      'strict', COUNT(*) FILTER (WHERE enforcement_level = 'strict'),
      'soft', COUNT(*) FILTER (WHERE enforcement_level = 'soft')
    )
  INTO v_policies_total, v_policies_active, v_policies_by_type, v_policies_by_enforcement
  FROM exam_policies
  WHERE organization_id = p_org_id
    AND created_at::date <= p_date;

  -- Tamper events for the day
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE resolved = true),
    COALESCE(jsonb_object_agg(event_type, cnt), '{}'::jsonb)
  INTO v_events_total, v_events_resolved, v_events_by_type
  FROM (
    SELECT event_type, COUNT(*) as cnt
    FROM tamper_events
    WHERE organization_id = p_org_id
      AND timestamp::date = p_date
    GROUP BY event_type
  ) sub;

  -- Average resolution time for resolved events
  SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - timestamp)) / 60)
  INTO v_avg_resolution
  FROM tamper_events
  WHERE organization_id = p_org_id
    AND timestamp::date = p_date
    AND resolved = true
    AND resolved_at IS NOT NULL;

  -- Admin activity from audit logs
  SELECT 
    COUNT(*),
    COALESCE(jsonb_object_agg(action, cnt), '{}'::jsonb),
    COUNT(DISTINCT actor_id)
  INTO v_admin_actions, v_admin_by_type, v_active_admins
  FROM (
    SELECT action, COUNT(*) as cnt, actor_id
    FROM audit_logs
    WHERE organization_id = p_org_id
      AND timestamp::date = p_date
    GROUP BY action, actor_id
  ) sub;

  -- Compute compliance score
  v_compliance_score := (
    CASE WHEN v_policies_total > 0 
      THEN (v_policies_active::numeric / v_policies_total) * 40 
      ELSE 0 END
    +
    CASE WHEN v_events_total > 0 
      THEN (v_events_resolved::numeric / v_events_total) * 40 
      ELSE 40 END
    +
    CASE WHEN v_active_admins > 0 THEN 20 ELSE 0 END
  );

  -- Upsert the daily metrics
  INSERT INTO metrics_daily (
    organization_id, metric_date,
    policies_total, policies_active, policies_by_type, policies_by_enforcement,
    events_total, events_resolved, events_unresolved, events_by_type, avg_resolution_minutes,
    admin_actions_total, admin_actions_by_type, active_admins_count,
    compliance_score, compliance_factors,
    computed_at
  ) VALUES (
    p_org_id, p_date,
    COALESCE(v_policies_total, 0), COALESCE(v_policies_active, 0), 
    COALESCE(v_policies_by_type, '{"exam":0,"focus":0,"custom":0}'::jsonb),
    COALESCE(v_policies_by_enforcement, '{"strict":0,"soft":0}'::jsonb),
    COALESCE(v_events_total, 0), COALESCE(v_events_resolved, 0), 
    COALESCE(v_events_total - v_events_resolved, 0),
    COALESCE(v_events_by_type, '{}'::jsonb), v_avg_resolution,
    COALESCE(v_admin_actions, 0), COALESCE(v_admin_by_type, '{}'::jsonb), 
    COALESCE(v_active_admins, 0),
    COALESCE(v_compliance_score, 0),
    jsonb_build_object(
      'policy_coverage', CASE WHEN v_policies_total > 0 
        THEN ROUND((v_policies_active::numeric / v_policies_total) * 100) ELSE 0 END,
      'event_resolution', CASE WHEN v_events_total > 0 
        THEN ROUND((v_events_resolved::numeric / v_events_total) * 100) ELSE 100 END,
      'admin_activity', CASE WHEN v_active_admins > 0 THEN 100 ELSE 0 END
    ),
    now()
  )
  ON CONFLICT (organization_id, metric_date)
  DO UPDATE SET
    policies_total = EXCLUDED.policies_total,
    policies_active = EXCLUDED.policies_active,
    policies_by_type = EXCLUDED.policies_by_type,
    policies_by_enforcement = EXCLUDED.policies_by_enforcement,
    events_total = EXCLUDED.events_total,
    events_resolved = EXCLUDED.events_resolved,
    events_unresolved = EXCLUDED.events_unresolved,
    events_by_type = EXCLUDED.events_by_type,
    avg_resolution_minutes = EXCLUDED.avg_resolution_minutes,
    admin_actions_total = EXCLUDED.admin_actions_total,
    admin_actions_by_type = EXCLUDED.admin_actions_by_type,
    active_admins_count = EXCLUDED.active_admins_count,
    compliance_score = EXCLUDED.compliance_score,
    compliance_factors = EXCLUDED.compliance_factors,
    computed_at = now()
  RETURNING id INTO v_metric_id;

  RETURN v_metric_id;
END;
$$;

-- ============================================================
-- Monthly Rollup Function
-- Aggregates daily metrics into monthly summaries
-- ============================================================
CREATE OR REPLACE FUNCTION public.aggregate_monthly_metrics(
  p_org_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')::INTEGER,
  p_month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')::INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metric_id UUID;
  v_first_score NUMERIC;
  v_last_score NUMERIC;
  v_trend TEXT;
BEGIN
  -- Get first and last compliance scores for trend
  SELECT compliance_score INTO v_first_score
  FROM metrics_daily
  WHERE organization_id = p_org_id
    AND EXTRACT(YEAR FROM metric_date) = p_year
    AND EXTRACT(MONTH FROM metric_date) = p_month
  ORDER BY metric_date ASC LIMIT 1;

  SELECT compliance_score INTO v_last_score
  FROM metrics_daily
  WHERE organization_id = p_org_id
    AND EXTRACT(YEAR FROM metric_date) = p_year
    AND EXTRACT(MONTH FROM metric_date) = p_month
  ORDER BY metric_date DESC LIMIT 1;

  -- Determine trend
  v_trend := CASE 
    WHEN v_last_score > v_first_score + 5 THEN 'improving'
    WHEN v_last_score < v_first_score - 5 THEN 'declining'
    ELSE 'stable'
  END;

  -- Aggregate and upsert monthly metrics
  INSERT INTO metrics_monthly (
    organization_id, metric_year, metric_month,
    avg_policies_total, avg_policies_active,
    total_events, total_resolved, resolution_rate, avg_resolution_minutes, events_by_type,
    total_admin_actions, unique_active_admins,
    avg_compliance_score, min_compliance_score, max_compliance_score, compliance_trend,
    avg_uptime_percentage, total_downtime_minutes,
    days_with_data, computed_at
  )
  SELECT 
    p_org_id, p_year, p_month,
    ROUND(AVG(policies_total), 2),
    ROUND(AVG(policies_active), 2),
    SUM(events_total),
    SUM(events_resolved),
    CASE WHEN SUM(events_total) > 0 
      THEN ROUND((SUM(events_resolved)::numeric / SUM(events_total)) * 100, 2) 
      ELSE 100 END,
    ROUND(AVG(avg_resolution_minutes), 2),
    '{}'::jsonb, -- Simplified: would need merge logic
    SUM(admin_actions_total),
    MAX(active_admins_count),
    ROUND(AVG(compliance_score), 2),
    MIN(compliance_score),
    MAX(compliance_score),
    v_trend,
    ROUND(AVG(uptime_percentage), 2),
    SUM(downtime_minutes),
    COUNT(*),
    now()
  FROM metrics_daily
  WHERE organization_id = p_org_id
    AND EXTRACT(YEAR FROM metric_date) = p_year
    AND EXTRACT(MONTH FROM metric_date) = p_month
  ON CONFLICT (organization_id, metric_year, metric_month)
  DO UPDATE SET
    avg_policies_total = EXCLUDED.avg_policies_total,
    avg_policies_active = EXCLUDED.avg_policies_active,
    total_events = EXCLUDED.total_events,
    total_resolved = EXCLUDED.total_resolved,
    resolution_rate = EXCLUDED.resolution_rate,
    avg_resolution_minutes = EXCLUDED.avg_resolution_minutes,
    total_admin_actions = EXCLUDED.total_admin_actions,
    unique_active_admins = EXCLUDED.unique_active_admins,
    avg_compliance_score = EXCLUDED.avg_compliance_score,
    min_compliance_score = EXCLUDED.min_compliance_score,
    max_compliance_score = EXCLUDED.max_compliance_score,
    compliance_trend = EXCLUDED.compliance_trend,
    avg_uptime_percentage = EXCLUDED.avg_uptime_percentage,
    total_downtime_minutes = EXCLUDED.total_downtime_minutes,
    days_with_data = EXCLUDED.days_with_data,
    computed_at = now()
  RETURNING id INTO v_metric_id;

  RETURN v_metric_id;
END;
$$;

-- ============================================================
-- Scheduled aggregation for all organizations
-- ============================================================
CREATE OR REPLACE FUNCTION public.run_daily_metrics_aggregation()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_org IN SELECT id FROM organizations WHERE is_active = true
  LOOP
    PERFORM aggregate_daily_metrics(v_org.id, CURRENT_DATE - INTERVAL '1 day');
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;