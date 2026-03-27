-- Extend assignment risk events with explicit admin-alert fields.
ALTER TABLE public.assignment_risk_events
  ADD COLUMN IF NOT EXISTS session_id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS process_name text,
  ADD COLUMN IF NOT EXISTS severity_level text
    CHECK (severity_level IN ('LOW', 'MEDIUM', 'HIGH'));

CREATE INDEX IF NOT EXISTS idx_assignment_risk_events_session
  ON public.assignment_risk_events (session_id);

CREATE INDEX IF NOT EXISTS idx_assignment_risk_events_severity
  ON public.assignment_risk_events (severity_level);
