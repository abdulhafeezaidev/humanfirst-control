-- ============================================================
-- Assignment Risk Detection Tables
-- Stores per-session risk events and computed risk scores
-- ============================================================

-- Raw risk events captured from the editor and domain logs
CREATE TABLE IF NOT EXISTS public.assignment_risk_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  assignment_id text,
  event_type text NOT NULL CHECK (event_type IN (
    'editor_large_paste',
    'suspicious_insert',
    'ai_domain_visit',
    'extended_research_no_typing'
  )),
  character_count integer,
  domain text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Computed risk scores per student per assignment session
CREATE TABLE IF NOT EXISTS public.assignment_risk_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  assignment_id text NOT NULL,
  risk_score integer NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level text NOT NULL DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
  ai_domain_visits integer NOT NULL DEFAULT 0,
  large_paste_count integer NOT NULL DEFAULT 0,
  suspicious_insert_count integer NOT NULL DEFAULT 0,
  extended_research_count integer NOT NULL DEFAULT 0,
  total_paste_characters integer NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, assignment_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_risk_events_user_assignment
  ON public.assignment_risk_events (user_id, assignment_id);

CREATE INDEX IF NOT EXISTS idx_risk_events_org
  ON public.assignment_risk_events (organization_id);

CREATE INDEX IF NOT EXISTS idx_risk_scores_user_assignment
  ON public.assignment_risk_scores (user_id, assignment_id);

CREATE INDEX IF NOT EXISTS idx_risk_scores_org_level
  ON public.assignment_risk_scores (organization_id, risk_level);

-- ============================================================
-- Row-Level Security
-- ============================================================

ALTER TABLE public.assignment_risk_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_risk_scores ENABLE ROW LEVEL SECURITY;

-- Students can insert their own events
CREATE POLICY "Students can insert own risk events"
  ON public.assignment_risk_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Students can view their own events
CREATE POLICY "Students can view own risk events"
  ON public.assignment_risk_events FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view events in their organization
CREATE POLICY "Admins can view org risk events"
  ON public.assignment_risk_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin', 'viewer')
        AND p.organization_id = assignment_risk_events.organization_id
    )
  );

-- Students can view their own scores
CREATE POLICY "Students can view own risk scores"
  ON public.assignment_risk_scores FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view scores in their organization
CREATE POLICY "Admins can view org risk scores"
  ON public.assignment_risk_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin', 'viewer')
        AND p.organization_id = assignment_risk_scores.organization_id
    )
  );

-- Service role can upsert scores (used by edge function)
CREATE POLICY "Service role can manage risk scores"
  ON public.assignment_risk_scores FOR ALL
  USING (true)
  WITH CHECK (true);

-- Service role can manage risk events
CREATE POLICY "Service role can manage risk events"
  ON public.assignment_risk_events FOR ALL
  USING (true)
  WITH CHECK (true);
